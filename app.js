/**
 * CV PRO - Main Application
 * Integrates Data Layer + Renderer + UI
 */

// ============================================
// MAIN APPLICATION
// ============================================

const CVApp = {
    // DOM Cache
    elements: {},

    // Flag to prevent re-render during content editing
    _isContentEditing: false,

    // ============================================
    // INITIALIZATION
    // ============================================

    init() {
        // Initialize state
        CVState.init();

        // Cache elements
        this.cacheElements();

        // Initial render
        this.renderCV();

        // Bind events
        this.bindEvents();

        // Apply saved theme
        this.applyTheme(CVState.get().settings?.theme || 'academic');

        // Subscribe to state changes
        CVState.subscribe((path, value, data) => {
            // Skip re-render if we're in the middle of a content edit
            if (this._isContentEditing) return;

            // Only re-render on major changes
            if (path === '*' ||
                path.startsWith('jobs') ||
                path.startsWith('skills') ||
                path.startsWith('education') ||
                path.startsWith('certifications') ||
                path.startsWith('languages') ||
                path.startsWith('hobbies') ||
                path.startsWith('settings')) {
                this.renderCV();
            }
        });


    },

    cacheElements() {
        this.elements = {
            cvContent: document.getElementById('cv-content'),
            themeSelect: document.getElementById('theme-select'),
            notification: document.getElementById('notification'),
            toolbar: document.querySelector('.toolbar'),
            jsonInput: document.getElementById('json-input')
        };
    },

    // ============================================
    // RENDERING
    // ============================================

    renderCV() {
        const data = CVState.get();
        CVRenderer.render(data, this.elements.cvContent);
    },

    // ============================================
    // EVENT BINDING
    // ============================================

    bindEvents() {

        // Toolbar actions
        document.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = btn.dataset.action;
                const value = btn.dataset.value;
                this.handleToolbarAction(action, { value });
            });
        });

        // Theme selector
        this.elements.themeSelect.addEventListener('change', (e) => {
            CVState.set('settings.theme', e.target.value);
            this.applyTheme(e.target.value);
        });

        // Section Toggles
        document.querySelectorAll('[data-toggle]').forEach(chk => {
            chk.addEventListener('change', (e) => {
                const setting = e.target.dataset.toggle;
                CVState.set(`settings.${setting}`, e.target.checked);
            });

            // Sync initial state
            const currentSettings = CVState.get()?.settings || {};
            if (currentSettings[chk.dataset.toggle] !== undefined) {
                chk.checked = currentSettings[chk.dataset.toggle];
            }
        });

        // Settings Selects (e.g., skillDisplayStyle)
        document.querySelectorAll('[data-setting]').forEach(sel => {
            sel.addEventListener('change', (e) => {
                const setting = e.target.dataset.setting;
                CVState.set(`settings.${setting}`, e.target.value);
            });

            // Sync initial state
            const currentSettings = CVState.get()?.settings || {};
            const settingKey = sel.dataset.setting;
            if (currentSettings[settingKey] !== undefined) {
                sel.value = currentSettings[settingKey];
            }
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            const dropdowns = document.querySelectorAll('.dropdown-menu');
            dropdowns.forEach(dd => {
                if (dd.style.display === 'block' && !dd.parentElement.contains(e.target)) {
                    dd.style.display = 'none';
                }
            });
        });

        // Toggle dropdown display
        const sectionsBtn = document.getElementById('btn-sections');
        if (sectionsBtn) {
            sectionsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const menu = document.getElementById('sections-menu');
                const isVisible = menu.style.display === 'block';
                menu.style.display = isVisible ? 'none' : 'block';
            });
        }

        // Content Editable Changes
        this.bindContentEditable();

        // Add Buttons and Delete Buttons
        this.elements.cvContent.addEventListener('click', (e) => {
            const addBtn = e.target.closest('.btn-add');
            if (addBtn) {
                this.handleAdd(addBtn.dataset.add);
            }

            const deleteBtn = e.target.closest('.delete-btn');
            if (deleteBtn) {
                const type = deleteBtn.dataset.delete;
                const id = deleteBtn.dataset.itemId;
                this.handleDelete(type, id);
            }

            // Skill Level Click — Progress Bar
            const progressBar = e.target.closest('.progress-bar');
            if (progressBar) {
                this.handleSkillClick(progressBar, e);
            }

            // Skill Level Click — Stars (click individual star)
            const starIcon = e.target.closest('.star-icon');
            if (starIcon) {
                const starIndex = parseInt(starIcon.dataset.starIndex);
                const starsContainer = starIcon.closest('.skill-level-stars');
                const skillId = starsContainer?.dataset?.skillId;
                if (skillId && starIndex) {
                    const percentage = starIndex * 20; // 1☆=20%, 2☆=40%, ... 5☆=100%
                    CVState.updateItem('skills', skillId, { level: percentage });
                }
            }

            // Skill Level Click — Blocks (click position based)
            const blocksLevel = e.target.closest('.skill-level-blocks');
            if (blocksLevel && !starIcon) {
                const skillId = blocksLevel.dataset.skillId;
                if (skillId) {
                    const blocksVisual = blocksLevel.querySelector('.blocks-visual');
                    if (blocksVisual) {
                        const rect = blocksVisual.getBoundingClientRect();
                        const x = e.clientX - rect.left;
                        const percentage = Math.max(0, Math.min(100, Math.round((x / rect.width) * 100)));
                        // Snap to nearest 10
                        const snapped = Math.round(percentage / 10) * 10;
                        CVState.updateItem('skills', skillId, { level: snapped });
                    }
                }
            }

            // Skill Level Click — Text Badge (cycle through levels)
            const textLevel = e.target.closest('.skill-level-text');
            if (textLevel) {
                const skillId = textLevel.dataset.skillId;
                if (skillId) {
                    const currentSkill = CVState.get().skills?.find(s => s.id === skillId);
                    const currentLevel = currentSkill?.level || 0;
                    // Cycle: Novice(10) → Beginner(30) → Intermediate(50) → Advanced(75) → Expert(95) → Novice(10)
                    const levels = [10, 30, 50, 75, 95];
                    const currentIdx = levels.findIndex(l => currentLevel <= l);
                    const nextIdx = (currentIdx + 1) % levels.length;
                    CVState.updateItem('skills', skillId, { level: levels[nextIdx] });
                }
            }
        });

        // JSON file input
        this.elements.jsonInput?.addEventListener('change', (e) => {
            this.uploadJSON(e.target);
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                CVState.saveNow();
                this.showNotify(I18n.t('notifications.saved'));
            }
        });
    },

    bindContentEditable() {
        this.elements.cvContent?.addEventListener('blur', (e) => {
            if (e.target.contentEditable === 'true') {
                this.handleContentEdit(e.target);
            }
        }, true);
    },

    // ============================================
    // TOOLBAR ACTIONS
    // ============================================

    handleToolbarAction(action, data) {

        switch (action) {
            case 'bold':
            case 'italic':
            case 'underline':
                document.execCommand(action, false, null);
                break;
            case 'fontSize':
                document.execCommand('fontSize', false, data.value);
                break;
            case 'download-json':
                this.downloadJSON();
                break;
            case 'reset':
                this.resetCV();
                break;
            case 'print':
                window.print();
                break;
            case 'export-pdf':
                if (typeof PDFExport !== 'undefined') {
                    PDFExport.export();
                } else {
                    window.print();
                }
                break;
        }
    },

    // ============================================
    // ADD NEW ITEMS
    // ============================================

    handleAdd(type) {
        switch (type) {
            case 'skill':
                CVState.addItem('skills', {
                    id: generateId('skill'),
                    name: I18n.t('mock.skill1'),
                    level: 50
                });
                break;
            case 'job':
                CVState.addItem('jobs', {
                    id: generateId('job'),
                    title: I18n.t('mock.jobTitle'),
                    company: I18n.t('mock.jobCompany'),
                    startDate: I18n.t('mock.jobStart'),
                    endDate: I18n.t('mock.jobEnd'),
                    current: true,
                    description: [I18n.t('mock.jobDesc1')]
                });
                break;
            case 'edu':
                CVState.addItem('education', {
                    id: generateId('edu'),
                    degree: I18n.t('mock.eduDegree'),
                    school: I18n.t('mock.eduSchool'),
                    startDate: I18n.t('mock.eduStart'),
                    endDate: I18n.t('mock.eduEnd'),
                    description: ''
                });
                break;
            case 'cert':
                CVState.addItem('certifications', {
                    id: generateId('cert'),
                    name: I18n.t('mock.certName'),
                    issuer: I18n.t('mock.certIssuer'),
                    date: new Date().getFullYear().toString(),
                    url: ''
                });
                break;
            case 'lang':
                CVState.addItem('languages', {
                    id: generateId('lang'),
                    name: I18n.t('mock.lang2'),
                    level: I18n.t('mock.lang2Level')
                });
                break;
            case 'hobby':
                CVState.addItem('hobbies', {
                    id: generateId('hobby'),
                    name: I18n.t('mock.hobby1')
                });
                break;
        }
        this.showNotify(I18n.t('notifications.added'));
    },

    // ============================================
    // DELETE ITEMS
    // ============================================

    handleDelete(type, id) {
        if (!type || !id) return;

        if (confirm(I18n.t('notifications.deleted') + '?')) {
            CVState.removeItem(type, id);
            this.showNotify(I18n.t('notifications.deleted'));
        }
    },

    // ============================================
    // SKILL LEVEL
    // ============================================

    handleSkillClick(progressBar, event) {
        const skillId = progressBar.dataset.skillId;
        if (!skillId) return;

        const rect = progressBar.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const percentage = Math.max(0, Math.min(100, Math.round((x / rect.width) * 100)));

        CVState.updateItem('skills', skillId, { level: percentage });

        // Update visual immediately
        const fill = progressBar.querySelector('.progress-fill');
        if (fill) fill.style.width = percentage + '%';
    },

    // ============================================
    // CONTENT EDITING
    // ============================================

    handleContentEdit(target) {
        const field = target.dataset.field;
        if (!field) return;

        // Set flag to prevent re-render during content editing
        this._isContentEditing = true;

        // Sanitization Configuration
        const clean = (html) => {
            if (typeof DOMPurify !== 'undefined') {
                return DOMPurify.sanitize(html, {
                    ALLOWED_TAGS: ['b', 'i', 'u', 'strong', 'em', 'br', 'p', 'div', 'span'],
                    ALLOWED_ATTR: []
                }).trim();
            }
            // Fallback: Strip all tags if library fails
            return html.replace(/<[^>]*>/g, '').trim();
        };

        let value;

        // Special handling for date fields (startDate - endDate)
        if (field.endsWith('.date')) {
            const rawText = clean(target.innerHTML);
            const parts = rawText.split(/\s*-\s*/);
            const startDate = (parts[0] || '').trim();
            const endDate = (parts[1] || '').trim();

            // Determine the parent path (e.g., 'jobs.job-1' from 'jobs.job-1.date')
            const parentPath = field.replace(/\.date$/, '');
            CVState.set(`${parentPath}.startDate`, startDate);
            CVState.set(`${parentPath}.endDate`, endDate);
            CVState.saveNow();

            // Reset flag after a tick to allow future re-renders
            requestAnimationFrame(() => { this._isContentEditing = false; });
            return;
        }

        // Special handling for description lists (bullet points)
        if (field.endsWith('.description')) {
            const lis = target.querySelectorAll('li');

            if (lis.length > 0) {
                // If structured list exists, sanitize each item
                value = Array.from(lis).map(li => clean(li.innerHTML)).filter(Boolean);
            } else {
                // If it's a plain text block (simulating list with newlines)
                let html = target.innerHTML;

                // Normalize breaks
                html = html.replace(/<div>/g, '<br>').replace(/<\/div>/g, '');
                html = html.replace(/<p>/g, '<br>').replace(/<\/p>/g, '');

                value = html.split('<br>')
                    .map(t => clean(t))
                    .filter(t => t.length > 0);
            }
        } else {
            // Simple value (Title, Name, etc.)
            value = clean(target.innerHTML);
        }

        // Handle path
        CVState.set(field, value);
        CVState.saveNow();

        // Reset flag after a tick to allow future re-renders
        requestAnimationFrame(() => { this._isContentEditing = false; });
    },

    // ============================================
    // THEME SYSTEM
    // ============================================

    changeTheme(theme) {
        this.applyTheme(theme);
        CVState.set('settings.theme', theme);
    },

    applyTheme(theme) {
        document.body.className = document.body.className.replace(/theme-\S+/g, '').trim();
        document.body.classList.add('theme-' + theme);

        if (this.elements.themeSelect) {
            this.elements.themeSelect.value = theme;
        }
    },

    // ============================================
    // IMPORT/EXPORT
    // ============================================

    downloadJSON() {
        const json = CVState.exportJSON();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'cv_yedek_' + new Date().toISOString().split('T')[0] + '.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showNotify(I18n.t('notifications.jsonDownloaded'));
    },

    uploadJSON(input) {
        if (!input.files || !input.files[0]) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            if (CVState.importJSON(e.target.result)) {
                this.renderCV();
                this.applyTheme(CVState.get().settings?.theme || 'academic');
                this.showNotify(I18n.t('notifications.cvLoaded'));
            } else {
                this.showNotify(I18n.t('notifications.invalidFile'));
            }
            input.value = '';
        };
        reader.readAsText(input.files[0]);
    },

    resetCV() {
        if (confirm(I18n.t('notifications.resetConfirm'))) {
            CVState.reset();
            this.renderCV();
            this.applyTheme('academic');
            this.showNotify(I18n.t('notifications.resetDone'));
        }
    },

    // ============================================
    // MOBILE PREVIEW MODE
    // ============================================

    _isPreviewMode: false,

    toggleMobilePreview() {
        this._isPreviewMode = !this._isPreviewMode;
        const body = document.body;
        const btn = document.getElementById('preview-toggle-btn');
        const page = document.querySelector('.page');

        if (this._isPreviewMode) {
            // Enter Preview Mode
            body.classList.add('mobile-preview-mode');
            btn?.classList.add('active');

            // Update button text
            const btnText = btn?.querySelector('span');
            if (btnText) btnText.textContent = I18n.t('buttons.edit') || 'Düzenle';
            const btnIcon = btn?.querySelector('i');
            if (btnIcon) {
                btnIcon.classList.remove('fa-eye');
                btnIcon.classList.add('fa-edit');
            }

            // Apply scale to fit screen
            this._applyPreviewScale();

            // Recalculate on resize
            this._resizeHandler = () => this._applyPreviewScale();
            window.addEventListener('resize', this._resizeHandler);
        } else {
            // Exit Preview Mode
            body.classList.remove('mobile-preview-mode');
            btn?.classList.remove('active');

            // Reset button text
            const btnText = btn?.querySelector('span');
            if (btnText) btnText.textContent = I18n.t('buttons.preview') || 'Önizle';
            const btnIcon = btn?.querySelector('i');
            if (btnIcon) {
                btnIcon.classList.remove('fa-edit');
                btnIcon.classList.add('fa-eye');
            }

            // Reset scale
            if (page) {
                page.style.transform = '';
                page.style.marginBottom = '';
            }

            // Remove resize handler
            if (this._resizeHandler) {
                window.removeEventListener('resize', this._resizeHandler);
            }
        }
    },

    _applyPreviewScale() {
        const page = document.querySelector('.page');
        if (!page) return;

        // A4 width in pixels at 96 DPI = 210mm * 3.7795... ≈ 793.7px
        const a4WidthPx = 793.7;
        const viewportWidth = window.innerWidth;
        const padding = 20; // 10px on each side

        const scale = (viewportWidth - padding) / a4WidthPx;
        const clampedScale = Math.min(scale, 1); // Never scale UP

        page.style.transform = `scale(${clampedScale})`;

        // Adjust margin to prevent cut-off due to scaling
        const originalHeight = page.scrollHeight;
        const scaledHeight = originalHeight * clampedScale;
        page.style.marginBottom = `-${originalHeight - scaledHeight}px`;
    },

    // ============================================
    // UTILITIES
    // ============================================

    showNotify(msg) {
        const n = this.elements.notification;
        if (!n) return;

        n.innerText = msg;
        n.style.display = 'block';

        if (this._notifyTimeout) clearTimeout(this._notifyTimeout);
        this._notifyTimeout = setTimeout(() => {
            n.style.display = 'none';
        }, 2500);
    }
};



// ============================================
// BOOT
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    CVApp.init();
});
