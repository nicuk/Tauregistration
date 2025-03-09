# TAUMine v0.dev Workflow Guide

## Overview

This guide outlines the workflow for keeping your TAUMine project in sync across:
- v0.dev designs
- Local development
- GitHub repository
- Vercel deployments

## Setup

Your environment is configured with:
- GitHub repository: `nicuk/Tauregistration`
- Main deployment: `taumine.vercel.app`
- v0.dev deployment: `v0-form-filling-rfy3icx2q-nicuks-projects.vercel.app`
- Local project: `c:\Users\nicos\CascadeProjects\tau-network-registration (3)`

## Workflow Steps

### 1. Creating Components with v0.dev

1. Visit [v0.dev](https://v0.dev)
2. Design your component using AI prompts
   - Example: "Create a mining dashboard with energy stats and team progress"
3. When satisfied, click "Copy Code"
4. Create a new file in your local project:
   ```
   components/v0/[ComponentName].tsx
   ```
5. Paste the code and adapt as needed

### 2. Syncing to GitHub and Vercel

After creating or modifying components:

1. Run the sync script:
   ```
   node scripts/v0dev-sync.js push "Component Name"
   ```
2. This will:
   - Commit your changes
   - Push to GitHub
   - Trigger automatic deployment on Vercel

### 3. Testing Deployments

- Main deployment: [taumine.vercel.app](https://taumine.vercel.app)
- v0.dev deployment: [v0-form-filling-rfy3icx2q-nicuks-projects.vercel.app](https://v0-form-filling-rfy3icx2q-nicuks-projects.vercel.app)

### 4. Using GitHub Copilot and Codeium

- Both tools work in your local environment
- Use them to help implement logic and functionality
- They don't directly interact with v0.dev or Vercel

## Component Organization

Recommended structure for v0.dev components:

```
components/
├── v0/
│   ├── MiningDashboard.tsx
│   ├── TeamProgress.tsx
│   ├── RegistrationForm.tsx
│   └── ... other v0 components
├── common/
│   └── ... shared components
└── ... other component directories
```

## Tips for Efficient Development

1. **Component Adaptation**: v0.dev components often need adaptation for your specific data structures
2. **State Management**: Add state management code to make components interactive
3. **API Integration**: Connect components to your Supabase backend
4. **Responsive Testing**: Test components across different screen sizes
5. **Performance Optimization**: Optimize components for production use

## Troubleshooting

If deployments aren't updating:
1. Check GitHub push status
2. Verify Vercel deployment logs
3. Try triggering a manual deployment in Vercel dashboard
