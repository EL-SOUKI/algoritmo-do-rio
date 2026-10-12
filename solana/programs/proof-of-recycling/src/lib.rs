use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{self, Burn, Mint, MintTo, TokenAccount, TokenInterface},
};

// Development placeholder. Run `anchor keys sync` before the first build/deploy.
declare_id!("9bQFX3gtGKwN6he7bkRWRFXQRLdBk1YE4YcHYEzcgoaG");

const PROTOCOL_SEED: &[u8] = b"protocol";
const REC_MINT_SEED: &[u8] = b"rec-mint";
const POINT_SEED: &[u8] = b"point";
const CAMPAIGN_SEED: &[u8] = b"campaign";
const PROOF_SEED: &[u8] = b"proof";
const REWARDS_SEED: &[u8] = b"rewards";
const IMPACT_POOL_SEED: &[u8] = b"impact-pool";
const CERTIFICATE_SEED: &[u8] = b"certificate";

#[program]
pub mod proof_of_recycling {
    use super::*;

    pub fn initialize_protocol(ctx: Context<InitializeProtocol>) -> Result<()> {
        let config = &mut ctx.accounts.config;
        config.authority = ctx.accounts.authority.key();
        config.rec_mint = ctx.accounts.rec_mint.key();
        config.total_verified_weight_grams = 0;
        config.total_rec_minted = 0;
        config.bump = ctx.bumps.config;

        emit!(ProtocolInitialized {
            authority: config.authority,
            rec_mint: config.rec_mint,
        });

        Ok(())
    }

    pub fn register_collection_point(
        ctx: Context<RegisterCollectionPoint>,
        point_id: [u8; 32],
        verifier: Pubkey,
        material_mask: u16,
    ) -> Result<()> {
        require!(material_mask != 0, ProtocolError::NoSupportedMaterials);

        let point = &mut ctx.accounts.collection_point;
        point.point_id = point_id;
        point.verifier = verifier;
        point.material_mask = material_mask;
        point.active = true;
        point.bump = ctx.bumps.collection_point;

        emit!(CollectionPointRegistered {
            collection_point: point.key(),
            verifier,
            material_mask,
        });

        Ok(())
    }

    pub fn set_collection_point_active(
        ctx: Context<SetCollectionPointActive>,
        active: bool,
    ) -> Result<()> {
        ctx.accounts.collection_point.active = active;
        Ok(())
    }

    pub fn create_campaign(
        ctx: Context<CreateCampaign>,
        campaign_id: [u8; 32],
        sponsor: Pubkey,
        material_type: MaterialType,
        reward_rec_per_kg: u64,
        starts_at: i64,
        ends_at: i64,
    ) -> Result<()> {
        require!(reward_rec_per_kg > 0, ProtocolError::InvalidRewardRate);
        require!(ends_at > starts_at, ProtocolError::InvalidCampaignWindow);

        let campaign = &mut ctx.accounts.campaign;
        campaign.campaign_id = campaign_id;
        campaign.sponsor = sponsor;
        campaign.material_type = material_type;
        campaign.reward_rec_per_kg = reward_rec_per_kg;
        campaign.starts_at = starts_at;
        campaign.ends_at = ends_at;
        campaign.active = true;
        campaign.bump = ctx.bumps.campaign;

        emit!(CampaignCreated {
            campaign: campaign.key(),
            sponsor,
            material_type,
            reward_rec_per_kg,
        });

        Ok(())
    }

    pub fn set_campaign_active(ctx: Context<SetCampaignActive>, active: bool) -> Result<()> {
        ctx.accounts.campaign.active = active;
        Ok(())
    }

    pub fn initialize_impact_pool(ctx: Context<InitializeImpactPool>) -> Result<()> {
        let impact_pool = &mut ctx.accounts.impact_pool;

        impact_pool.campaign = ctx.accounts.campaign.key();
        impact_pool.total_verified_weight_grams = 0;
        impact_pool.total_rec_minted = 0;
        impact_pool.total_retired_weight_grams = 0;
        impact_pool.total_rec_burned = 0;
        impact_pool.bump = ctx.bumps.impact_pool;

        emit!(ImpactPoolInitialized {
            impact_pool: impact_pool.key(),
            campaign: impact_pool.campaign,
        });

        Ok(())
    }

    pub fn burn_for_certificate(
        ctx: Context<BurnForCertificate>,
        certificate_id: [u8; 32],
        rec_amount: u64,
    ) -> Result<()> {
        require!(
            rec_amount > 0,
            ProtocolError::InvalidBurnAmount
        );

        let available_rec = ctx
            .accounts
            .impact_pool
            .total_rec_minted
            .checked_sub(
                ctx.accounts.impact_pool.total_rec_burned
            )
            .ok_or(ProtocolError::MathOverflow)?;

        require!(
            available_rec > 0,
            ProtocolError::NoAvailableImpact
        );

        require!(
            rec_amount <= available_rec,
            ProtocolError::InsufficientImpactPoolRec
        );

        let available_weight_grams = ctx
            .accounts
            .impact_pool
            .total_verified_weight_grams
            .checked_sub(
                ctx.accounts
                    .impact_pool
                    .total_retired_weight_grams
            )
            .ok_or(ProtocolError::MathOverflow)?;

        require!(
            available_weight_grams > 0,
            ProtocolError::NoAvailableImpact
        );

        // The certificate retires the same proportion of physical
        // impact as the proportion of remaining REC that is burned.
        //
        // Example:
        // 2400 g verified / 24 REC
        // burn 10 REC -> retire 1000 g.
        //
        // This avoids permanently hard-coding a kg/REC conversion.
        let retired_weight_grams =
            if rec_amount == available_rec {
                available_weight_grams
            } else {
                let proportional_weight =
                    (rec_amount as u128)
                        .checked_mul(
                            available_weight_grams as u128
                        )
                        .ok_or(
                            ProtocolError::MathOverflow
                        )?
                        .checked_div(
                            available_rec as u128
                        )
                        .ok_or(
                            ProtocolError::MathOverflow
                        )?;

                require!(
                    proportional_weight > 0
                        && proportional_weight
                            <= u64::MAX as u128,
                    ProtocolError::RetirementTooSmall
                );

                proportional_weight as u64
            };

        //
        // Burn REC permanently from the company's token account.
        //
        let burn_accounts = Burn {
            mint: ctx.accounts.rec_mint.to_account_info(),
            from: ctx
                .accounts
                .company_rec_account
                .to_account_info(),
            authority: ctx.accounts.company.to_account_info(),
        };

        let burn_ctx = CpiContext::new(
            ctx.accounts.token_program.key(),
            burn_accounts,
        );

        token_interface::burn(
            burn_ctx,
            rec_amount,
        )?;

        let now = Clock::get()?.unix_timestamp;

        //
        // Update environmental accounting.
        //
        let impact_pool = &mut ctx.accounts.impact_pool;

        impact_pool.total_rec_burned = impact_pool
            .total_rec_burned
            .checked_add(rec_amount)
            .ok_or(ProtocolError::MathOverflow)?;

        impact_pool.total_retired_weight_grams =
            impact_pool
                .total_retired_weight_grams
                .checked_add(retired_weight_grams)
                .ok_or(ProtocolError::MathOverflow)?;

        //
        // Create immutable on-chain certificate.
        //
        let certificate =
            &mut ctx.accounts.impact_certificate;

        certificate.certificate_id = certificate_id;
        certificate.owner = ctx.accounts.company.key();
        certificate.campaign = ctx.accounts.campaign.key();
        certificate.impact_pool = impact_pool.key();
        certificate.rec_burned = rec_amount;
        certificate.retired_weight_grams =
            retired_weight_grams;
        certificate.created_at = now;
        certificate.bump =
            ctx.bumps.impact_certificate;

        emit!(ImpactCertificateCreated {
            certificate: certificate.key(),
            owner: certificate.owner,
            campaign: certificate.campaign,
            impact_pool: certificate.impact_pool,
            rec_burned: certificate.rec_burned,
            retired_weight_grams:
                certificate.retired_weight_grams,
            created_at: certificate.created_at,
        });

        Ok(())
    }

    /// Finalizes a physically verified recycling event and mints REC directly to
    /// the recycler's associated token account.
    ///
    /// `proof_hash` is a deterministic 32-byte SHA-256 digest created by the API
    /// from the verified physical event. Because it is part of the proof PDA seeds,
    /// Anchor's `init` guarantees the same proof cannot be accepted twice.
    pub fn verify_recycling(
        ctx: Context<VerifyRecycling>,
        proof_hash: [u8; 32],
        material_type: MaterialType,
        weight_grams: u64,
    ) -> Result<()> {
        require!(weight_grams > 0, ProtocolError::InvalidWeight);
        require!(ctx.accounts.collection_point.active, ProtocolError::InactiveCollectionPoint);
        require!(ctx.accounts.campaign.active, ProtocolError::InactiveCampaign);
        require_keys_eq!(
            ctx.accounts.verifier.key(),
            ctx.accounts.collection_point.verifier,
            ProtocolError::UnauthorizedVerifier
        );
        require!(
            ctx.accounts.campaign.material_type == material_type,
            ProtocolError::CampaignMaterialMismatch
        );
        require!(
            material_is_supported(ctx.accounts.collection_point.material_mask, material_type),
            ProtocolError::UnsupportedMaterial
        );

        let now = Clock::get()?.unix_timestamp;
        require!(
            now >= ctx.accounts.campaign.starts_at && now <= ctx.accounts.campaign.ends_at,
            ProtocolError::CampaignOutsideWindow
        );

        // Mirrors the MVP backend rule: round(weightKg * REC/kg), with a floor of 1 REC.
        let numerator = weight_grams
            .checked_mul(ctx.accounts.campaign.reward_rec_per_kg)
            .ok_or(ProtocolError::MathOverflow)?;
        let rounded = numerator
            .checked_add(500)
            .ok_or(ProtocolError::MathOverflow)?
            .checked_div(1000)
            .ok_or(ProtocolError::MathOverflow)?;
        let reward_rec = rounded.max(1);

        let proof = &mut ctx.accounts.recycling_proof;
        proof.proof_hash = proof_hash;
        proof.recycler = ctx.accounts.recycler_wallet.key();
        proof.collection_point = ctx.accounts.collection_point.key();
        proof.campaign = ctx.accounts.campaign.key();
        proof.material_type = material_type;
        proof.weight_grams = weight_grams;
        proof.reward_rec = reward_rec;
        proof.verified_at = now;
        proof.bump = ctx.bumps.recycling_proof;

        let ledger = &mut ctx.accounts.reward_ledger;
        if ledger.recycler == Pubkey::default() {
            ledger.recycler = ctx.accounts.recycler_wallet.key();
            ledger.bump = ctx.bumps.reward_ledger;
        }
        ledger.total_weight_grams = ledger
            .total_weight_grams
            .checked_add(weight_grams)
            .ok_or(ProtocolError::MathOverflow)?;
        ledger.total_rec_minted = ledger
            .total_rec_minted
            .checked_add(reward_rec)
            .ok_or(ProtocolError::MathOverflow)?;

        let config = &mut ctx.accounts.config;
        config.total_verified_weight_grams = config
            .total_verified_weight_grams
            .checked_add(weight_grams)
            .ok_or(ProtocolError::MathOverflow)?;
        config.total_rec_minted = config
            .total_rec_minted
            .checked_add(reward_rec)
            .ok_or(ProtocolError::MathOverflow)?;

        let (pool_verified_weight_grams, pool_rec_minted) = {
            let impact_pool = &mut ctx.accounts.impact_pool;

            impact_pool.total_verified_weight_grams = impact_pool
                .total_verified_weight_grams
                .checked_add(weight_grams)
                .ok_or(ProtocolError::MathOverflow)?;

            impact_pool.total_rec_minted = impact_pool
                .total_rec_minted
                .checked_add(reward_rec)
                .ok_or(ProtocolError::MathOverflow)?;

            (
                impact_pool.total_verified_weight_grams,
                impact_pool.total_rec_minted,
            )
        };

        // The REC mint is a PDA and is its own mint authority. The program signs
        // this CPI with the mint PDA seeds, so no external wallet can arbitrarily mint REC.
        let mint_bump = ctx.bumps.rec_mint;
        let mint_signer_seeds: &[&[&[u8]]] = &[&[REC_MINT_SEED, &[mint_bump]]];
        let cpi_accounts = MintTo {
            mint: ctx.accounts.rec_mint.to_account_info(),
            to: ctx.accounts.recycler_rec_account.to_account_info(),
            authority: ctx.accounts.rec_mint.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(
            ctx.accounts.token_program.key(),
            cpi_accounts,
        )
        .with_signer(mint_signer_seeds);
        token_interface::mint_to(cpi_ctx, reward_rec)?;

        emit!(ImpactPoolUpdated {
            impact_pool: ctx.accounts.impact_pool.key(),
            campaign: ctx.accounts.campaign.key(),
            verified_weight_grams: pool_verified_weight_grams,
            rec_minted: pool_rec_minted,
        });

        emit!(RecyclingVerified {
            proof: proof.key(),
            recycler: proof.recycler,
            collection_point: proof.collection_point,
            campaign: proof.campaign,
            material_type,
            weight_grams,
            reward_rec,
            verified_at: now,
        });

        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeProtocol<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = 8 + ProtocolConfig::INIT_SPACE,
        seeds = [PROTOCOL_SEED],
        bump
    )]
    pub config: Account<'info, ProtocolConfig>,

    #[account(
        init,
        payer = authority,
        seeds = [REC_MINT_SEED],
        bump,
        mint::decimals = 0,
        mint::authority = rec_mint,
        mint::freeze_authority = rec_mint,
        mint::token_program = token_program
    )]
    pub rec_mint: InterfaceAccount<'info, Mint>,

    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(point_id: [u8; 32])]
pub struct RegisterCollectionPoint<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        seeds = [PROTOCOL_SEED],
        bump = config.bump,
        has_one = authority @ ProtocolError::UnauthorizedAuthority
    )]
    pub config: Account<'info, ProtocolConfig>,

    #[account(
        init,
        payer = authority,
        space = 8 + CollectionPoint::INIT_SPACE,
        seeds = [POINT_SEED, point_id.as_ref()],
        bump
    )]
    pub collection_point: Account<'info, CollectionPoint>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SetCollectionPointActive<'info> {
    pub authority: Signer<'info>,

    #[account(
        seeds = [PROTOCOL_SEED],
        bump = config.bump,
        has_one = authority @ ProtocolError::UnauthorizedAuthority
    )]
    pub config: Account<'info, ProtocolConfig>,

    #[account(mut)]
    pub collection_point: Account<'info, CollectionPoint>,
}

#[derive(Accounts)]
#[instruction(campaign_id: [u8; 32])]
pub struct CreateCampaign<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        seeds = [PROTOCOL_SEED],
        bump = config.bump,
        has_one = authority @ ProtocolError::UnauthorizedAuthority
    )]
    pub config: Account<'info, ProtocolConfig>,

    #[account(
        init,
        payer = authority,
        space = 8 + Campaign::INIT_SPACE,
        seeds = [CAMPAIGN_SEED, campaign_id.as_ref()],
        bump
    )]
    pub campaign: Account<'info, Campaign>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SetCampaignActive<'info> {
    pub authority: Signer<'info>,

    #[account(
        seeds = [PROTOCOL_SEED],
        bump = config.bump,
        has_one = authority @ ProtocolError::UnauthorizedAuthority
    )]
    pub config: Account<'info, ProtocolConfig>,

    #[account(mut)]
    pub campaign: Account<'info, Campaign>,
}

#[derive(Accounts)]
pub struct InitializeImpactPool<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        seeds = [PROTOCOL_SEED],
        bump = config.bump,
        has_one = authority @ ProtocolError::UnauthorizedAuthority
    )]
    pub config: Account<'info, ProtocolConfig>,

    pub campaign: Account<'info, Campaign>,

    #[account(
        init,
        payer = authority,
        space = 8 + ImpactPool::INIT_SPACE,
        seeds = [IMPACT_POOL_SEED, campaign.key().as_ref()],
        bump
    )]
    pub impact_pool: Account<'info, ImpactPool>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(
    certificate_id: [u8; 32],
    rec_amount: u64
)]
pub struct BurnForCertificate<'info> {
    #[account(mut)]
    pub company: Signer<'info>,

    #[account(
        seeds = [PROTOCOL_SEED],
        bump = config.bump,
        constraint =
            config.rec_mint == rec_mint.key()
            @ ProtocolError::InvalidRecMint
    )]
    pub config: Account<'info, ProtocolConfig>,

    #[account(
        mut,
        seeds = [REC_MINT_SEED],
        bump,
        mint::authority = rec_mint,
        mint::token_program = token_program
    )]
    pub rec_mint: InterfaceAccount<'info, Mint>,

    pub campaign: Account<'info, Campaign>,

    #[account(
        mut,
        seeds = [
            IMPACT_POOL_SEED,
            campaign.key().as_ref()
        ],
        bump = impact_pool.bump,
        constraint =
            impact_pool.campaign == campaign.key()
            @ ProtocolError::InvalidImpactPool
    )]
    pub impact_pool: Account<'info, ImpactPool>,

    #[account(
        mut,
        associated_token::mint = rec_mint,
        associated_token::authority = company,
        associated_token::token_program = token_program
    )]
    pub company_rec_account:
        InterfaceAccount<'info, TokenAccount>,

    #[account(
        init,
        payer = company,
        space = 8 + ImpactCertificate::INIT_SPACE,
        seeds = [
            CERTIFICATE_SEED,
            campaign.key().as_ref(),
            certificate_id.as_ref()
        ],
        bump
    )]
    pub impact_certificate:
        Account<'info, ImpactCertificate>,

    pub token_program:
        Interface<'info, TokenInterface>,

    pub associated_token_program:
        Program<'info, AssociatedToken>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(proof_hash: [u8; 32])]
pub struct VerifyRecycling<'info> {
    #[account(mut)]
    pub verifier: Signer<'info>,

    #[account(
        mut,
        seeds = [PROTOCOL_SEED],
        bump = config.bump,
        constraint = config.rec_mint == rec_mint.key() @ ProtocolError::InvalidRecMint
    )]
    pub config: Account<'info, ProtocolConfig>,

    #[account(
        mut,
        seeds = [REC_MINT_SEED],
        bump,
        mint::authority = rec_mint,
        mint::token_program = token_program
    )]
    pub rec_mint: InterfaceAccount<'info, Mint>,

    pub collection_point: Account<'info, CollectionPoint>,
    pub campaign: Account<'info, Campaign>,

    #[account(
        mut,
        seeds = [IMPACT_POOL_SEED, campaign.key().as_ref()],
        bump = impact_pool.bump,
        constraint = impact_pool.campaign == campaign.key() @ ProtocolError::InvalidImpactPool
    )]
    pub impact_pool: Account<'info, ImpactPool>,

    /// CHECK: This public key is the owner of the destination associated token account.
    pub recycler_wallet: UncheckedAccount<'info>,

    #[account(
        init_if_needed,
        payer = verifier,
        associated_token::mint = rec_mint,
        associated_token::authority = recycler_wallet,
        associated_token::token_program = token_program
    )]
    pub recycler_rec_account: InterfaceAccount<'info, TokenAccount>,

    #[account(
        init,
        payer = verifier,
        space = 8 + RecyclingProof::INIT_SPACE,
        seeds = [PROOF_SEED, proof_hash.as_ref()],
        bump
    )]
    pub recycling_proof: Account<'info, RecyclingProof>,

    #[account(
        init_if_needed,
        payer = verifier,
        space = 8 + RewardLedger::INIT_SPACE,
        seeds = [REWARDS_SEED, recycler_wallet.key().as_ref()],
        bump
    )]
    pub reward_ledger: Account<'info, RewardLedger>,

    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[account]
#[derive(InitSpace)]
pub struct ProtocolConfig {
    pub authority: Pubkey,
    pub rec_mint: Pubkey,
    pub total_verified_weight_grams: u64,
    pub total_rec_minted: u64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct CollectionPoint {
    pub point_id: [u8; 32],
    pub verifier: Pubkey,
    pub material_mask: u16,
    pub active: bool,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Campaign {
    pub campaign_id: [u8; 32],
    pub sponsor: Pubkey,
    pub material_type: MaterialType,
    pub reward_rec_per_kg: u64,
    pub starts_at: i64,
    pub ends_at: i64,
    pub active: bool,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct RecyclingProof {
    pub proof_hash: [u8; 32],
    pub recycler: Pubkey,
    pub collection_point: Pubkey,
    pub campaign: Pubkey,
    pub material_type: MaterialType,
    pub weight_grams: u64,
    pub reward_rec: u64,
    pub verified_at: i64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct RewardLedger {
    pub recycler: Pubkey,
    pub total_weight_grams: u64,
    pub total_rec_minted: u64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct ImpactPool {
    pub campaign: Pubkey,
    pub total_verified_weight_grams: u64,
    pub total_rec_minted: u64,
    pub total_retired_weight_grams: u64,
    pub total_rec_burned: u64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct ImpactCertificate {
    pub certificate_id: [u8; 32],
    pub owner: Pubkey,
    pub campaign: Pubkey,
    pub impact_pool: Pubkey,
    pub rec_burned: u64,
    pub retired_weight_grams: u64,
    pub created_at: i64,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq, InitSpace)]
pub enum MaterialType {
    PetPlastic,
    OtherPlastic,
    Aluminum,
    Glass,
    Paper,
    Cardboard,
    Electronics,
}

impl MaterialType {
    pub fn bit(self) -> u16 {
        match self {
            Self::PetPlastic => 1 << 0,
            Self::OtherPlastic => 1 << 1,
            Self::Aluminum => 1 << 2,
            Self::Glass => 1 << 3,
            Self::Paper => 1 << 4,
            Self::Cardboard => 1 << 5,
            Self::Electronics => 1 << 6,
        }
    }
}

fn material_is_supported(mask: u16, material: MaterialType) -> bool {
    mask & material.bit() != 0
}

#[event]
pub struct ProtocolInitialized {
    pub authority: Pubkey,
    pub rec_mint: Pubkey,
}

#[event]
pub struct CollectionPointRegistered {
    pub collection_point: Pubkey,
    pub verifier: Pubkey,
    pub material_mask: u16,
}

#[event]
pub struct CampaignCreated {
    pub campaign: Pubkey,
    pub sponsor: Pubkey,
    pub material_type: MaterialType,
    pub reward_rec_per_kg: u64,
}

#[event]
pub struct ImpactPoolInitialized {
    pub impact_pool: Pubkey,
    pub campaign: Pubkey,
}

#[event]
pub struct ImpactPoolUpdated {
    pub impact_pool: Pubkey,
    pub campaign: Pubkey,
    pub verified_weight_grams: u64,
    pub rec_minted: u64,
}

#[event]
pub struct ImpactCertificateCreated {
    pub certificate: Pubkey,
    pub owner: Pubkey,
    pub campaign: Pubkey,
    pub impact_pool: Pubkey,
    pub rec_burned: u64,
    pub retired_weight_grams: u64,
    pub created_at: i64,
}

#[event]
pub struct RecyclingVerified {
    pub proof: Pubkey,
    pub recycler: Pubkey,
    pub collection_point: Pubkey,
    pub campaign: Pubkey,
    pub material_type: MaterialType,
    pub weight_grams: u64,
    pub reward_rec: u64,
    pub verified_at: i64,
}

#[error_code]
pub enum ProtocolError {
    #[msg("Only the protocol authority may perform this action.")]
    UnauthorizedAuthority,
    #[msg("The collection point verifier does not match the transaction signer.")]
    UnauthorizedVerifier,
    #[msg("Collection point is inactive.")]
    InactiveCollectionPoint,
    #[msg("Campaign is inactive.")]
    InactiveCampaign,
    #[msg("The campaign is outside its active time window.")]
    CampaignOutsideWindow,
    #[msg("Campaign material does not match the recycling event.")]
    CampaignMaterialMismatch,
    #[msg("The collection point does not accept this material.")]
    UnsupportedMaterial,
    #[msg("Collection point must support at least one material.")]
    NoSupportedMaterials,
    #[msg("Weight must be greater than zero.")]
    InvalidWeight,
    #[msg("Reward rate must be greater than zero.")]
    InvalidRewardRate,
    #[msg("Campaign end must be after campaign start.")]
    InvalidCampaignWindow,
    #[msg("The supplied REC mint is not the protocol REC mint.")]
    InvalidRecMint,
    #[msg("The supplied impact pool does not belong to this campaign.")]
    InvalidImpactPool,

    #[msg("Burn amount must be greater than zero.")]
    InvalidBurnAmount,

    #[msg("The selected impact pool does not have enough REC available to retire.")]
    InsufficientImpactPoolRec,

    #[msg("The selected impact pool has no remaining impact available to retire.")]
    NoAvailableImpact,

    #[msg("The requested retirement is too small to represent at least one gram of impact.")]
    RetirementTooSmall,

    #[msg("Arithmetic overflow.")]
    MathOverflow,
}
