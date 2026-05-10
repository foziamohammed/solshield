use anchor_lang::prelude::*;

declare_id!("So1Sh1e1dFLAGGEDwa11etPr0gramDevnetAddr111");

#[program]
pub mod solshield {
    use super::*;

    /// Flag a wallet address as suspicious.
    /// Creates a PDA account storing the flag data.
    pub fn flag_address(
        ctx: Context<FlagAddress>,
        flagged_address: Pubkey,
        reason: String,
        risk_level: u8,
    ) -> Result<()> {
        require!(reason.len() <= 256, SolShieldError::ReasonTooLong);
        require!(risk_level <= 100, SolShieldError::InvalidRiskLevel);

        let flag_account = &mut ctx.accounts.flag_account;
        flag_account.flagged_address = flagged_address;
        flag_account.reporter = ctx.accounts.reporter.key();
        flag_account.reason = reason;
        flag_account.risk_level = risk_level;
        flag_account.timestamp = Clock::get()?.unix_timestamp;
        flag_account.is_active = true;
        flag_account.bump = ctx.bumps.flag_account;

        emit!(AddressFlagged {
            flagged_address,
            reporter: ctx.accounts.reporter.key(),
            risk_level,
            timestamp: flag_account.timestamp,
        });

        msg!("Address {} flagged with risk level {}", flagged_address, risk_level);
        Ok(())
    }

    /// Remove a flag (only the original reporter can unflag).
    pub fn unflag_address(ctx: Context<UnflagAddress>) -> Result<()> {
        let flag_account = &mut ctx.accounts.flag_account;
        
        require!(
            flag_account.reporter == ctx.accounts.reporter.key(),
            SolShieldError::Unauthorized
        );

        flag_account.is_active = false;

        emit!(AddressUnflagged {
            flagged_address: flag_account.flagged_address,
            reporter: ctx.accounts.reporter.key(),
            timestamp: Clock::get()?.unix_timestamp,
        });

        msg!("Flag removed for address {}", flag_account.flagged_address);
        Ok(())
    }

    /// Initialize the registry (one-time setup).
    pub fn initialize_registry(ctx: Context<InitializeRegistry>) -> Result<()> {
        let registry = &mut ctx.accounts.registry;
        registry.authority = ctx.accounts.authority.key();
        registry.total_flags = 0;
        registry.bump = ctx.bumps.registry;

        msg!("SolShield registry initialized");
        Ok(())
    }
}

// === Account Structures ===

#[account]
#[derive(InitSpace)]
pub struct FlagAccount {
    /// The address being flagged
    pub flagged_address: Pubkey,
    /// Who reported this address
    pub reporter: Pubkey,
    /// Reason for flagging
    #[max_len(256)]
    pub reason: String,
    /// Risk level (0-100)
    pub risk_level: u8,
    /// Unix timestamp of when it was flagged
    pub timestamp: i64,
    /// Whether the flag is currently active
    pub is_active: bool,
    /// PDA bump seed
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Registry {
    /// Registry authority
    pub authority: Pubkey,
    /// Total number of flags ever created
    pub total_flags: u64,
    /// PDA bump seed
    pub bump: u8,
}

// === Instruction Contexts ===

#[derive(Accounts)]
#[instruction(flagged_address: Pubkey)]
pub struct FlagAddress<'info> {
    #[account(
        init,
        payer = reporter,
        space = 8 + FlagAccount::INIT_SPACE,
        seeds = [b"flagged", flagged_address.as_ref()],
        bump,
    )]
    pub flag_account: Account<'info, FlagAccount>,

    #[account(mut)]
    pub reporter: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UnflagAddress<'info> {
    #[account(
        mut,
        seeds = [b"flagged", flag_account.flagged_address.as_ref()],
        bump = flag_account.bump,
    )]
    pub flag_account: Account<'info, FlagAccount>,

    #[account(mut)]
    pub reporter: Signer<'info>,
}

#[derive(Accounts)]
pub struct InitializeRegistry<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Registry::INIT_SPACE,
        seeds = [b"registry"],
        bump,
    )]
    pub registry: Account<'info, Registry>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

// === Events ===

#[event]
pub struct AddressFlagged {
    pub flagged_address: Pubkey,
    pub reporter: Pubkey,
    pub risk_level: u8,
    pub timestamp: i64,
}

#[event]
pub struct AddressUnflagged {
    pub flagged_address: Pubkey,
    pub reporter: Pubkey,
    pub timestamp: i64,
}

// === Errors ===

#[error_code]
pub enum SolShieldError {
    #[msg("Reason string exceeds maximum length of 256 characters")]
    ReasonTooLong,
    #[msg("Risk level must be between 0 and 100")]
    InvalidRiskLevel,
    #[msg("Only the original reporter can unflag an address")]
    Unauthorized,
}
