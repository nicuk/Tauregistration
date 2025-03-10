# TAUMine Referral System

## Overview
TAUMine is a platform that implements a comprehensive referral tracking system. The system tracks user verification progress across multiple steps, calculates rewards based on completed tasks, and displays this information clearly in the user interface.

## Key Features
- 5-step verification model (email, Twitter, Telegram, Twitter sharing, first referral)
- Each step contributes 20% to the overall completion and unlocks 2,000 TAU
- Maximum of 10,000 TAU per referral
- Detailed verification status display in the UI
- Leaderboard showing top referrers

## Database Schema
The system uses two main tables:
- `profiles`: Stores user information and verification statuses
- `referral_stats`: Tracks referral statistics and rewards

## Deployment
The application is deployed on Vercel and can be accessed at taumine.vercel.app.

## Last Updated
March 10, 2025 - Enhanced referral tracking system with 5-step verification model
