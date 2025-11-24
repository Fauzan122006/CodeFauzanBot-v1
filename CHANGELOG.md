# CHANGELOG

## [v1.1.0] - 2025-11-24

### 🔥 Critical Fixes

#### Canvas Module Error Fix (Pterodactyl/VPS)
- **Problem**: Bot crashed with `invalid ELF header` error when running on Pterodactyl
- **Solution**: 
  - Made canvas module optional with fallback
  - Bot now runs even if canvas fails to load
  - Welcome cards and rank cards gracefully disabled when canvas unavailable
  - Added simple text welcome fallback
- **Files Modified**: `dashboard.js`

#### Dashboard Members Timeout Fix
- **Problem**: Dashboard showed error "Members didn't arrive in time" on large servers
- **Solution**:
  - Removed member fetching with timeout
  - Now uses cached member data only
  - Online member count calculated from existing cache
  - Much faster dashboard loading
- **Files Modified**: `dashboard.js`

### ✨ Enhancements

#### Better Error Handling
- Added comprehensive try-catch blocks
- Canvas availability checks before rendering
- Fallback mechanisms for all image generation
- Clear error messages in logs

#### Documentation
- Updated README.md with troubleshooting guide
- Added PTERODACTYL_SETUP.md with deployment instructions
- Added detailed canvas rebuild instructions
- Documented all known issues and solutions

#### Configuration
- Updated package.json with npm scripts
- Added `npm run rebuild` for canvas rebuilding
- Improved .gitignore to exclude temporary files
- Added .dockerignore for container deployment

### 🐛 Bug Fixes
1. Fixed canvas module being required even when not available
2. Fixed font registration skipping when canvas unavailable
3. Fixed welcome card preview endpoint error handling
4. Fixed rank card preview endpoint error handling
5. Removed forced member fetching in dashboard
6. Added safety checks for presence data

### 📝 Code Quality
- Added consistent error logging
- Improved code organization
- Better separation of concerns
- Clearer function responsibilities

### 🚀 Performance
- Faster dashboard loading (no member fetching)
- Reduced API calls to Discord
- Better cache utilization
- Graceful degradation when features unavailable

---

## [v1.0.0] - Initial Release

### Features
- Discord bot with slash commands
- Web dashboard with OAuth2
- Welcome system with custom cards
- Leveling system with XP and ranks
- Auto moderation (spam, invites, links, caps, mentions)
- Role management and auto-roles
- Rules system with accept button
- Achievement system
- YouTube integration
- Custom rank cards
- Multiple font support

### Core Components
- Express web server
- EJS templating
- Passport Discord authentication
- Canvas image generation
- Database management
- Event handling system

---

## Future Updates

### Planned Features
- [ ] Music player commands
- [ ] Ticket system
- [ ] Verification system
- [ ] Logging system (message logs, mod logs)
- [ ] Reaction roles v2
- [ ] Custom commands builder
- [ ] Scheduled messages
- [ ] Polls and voting
- [ ] Giveaway system
- [ ] Economy system enhancements

### Planned Improvements
- [ ] Dashboard UI/UX improvements (inspired by MEE6)
- [ ] Mobile responsive dashboard
- [ ] Dark/Light theme toggle
- [ ] More customization options
- [ ] Better analytics
- [ ] Export/Import server settings
- [ ] Multi-language support
- [ ] Performance optimizations

### Technical Debt
- [ ] Migrate to TypeScript
- [ ] Add comprehensive testing
- [ ] Implement CI/CD pipeline
- [ ] Database migration to MongoDB/PostgreSQL
- [ ] WebSocket for real-time updates
- [ ] API rate limit handler improvements
- [ ] Caching layer (Redis)

---

## Notes

### Canvas Module
The canvas module is platform-dependent and may need rebuilding:
```bash
npm rebuild canvas --build-from-source
```

For Debian/Ubuntu systems:
```bash
apt-get install -y build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev
npm rebuild canvas --build-from-source
```

### Pterodactyl Deployment
See PTERODACTYL_SETUP.md for detailed deployment instructions.

### Breaking Changes
None in v1.1.0 - fully backward compatible with v1.0.0

---

**Version Numbering**: MAJOR.MINOR.PATCH
- MAJOR: Breaking changes
- MINOR: New features, non-breaking
- PATCH: Bug fixes, patches
