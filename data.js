/**
 * CV PRO - Data Layer
 * JSON-based CV Data Model & State Management
 */

// ============================================
// CV DATA SCHEMA
// ============================================

/**
 * Create empty CV data structure
 * @returns {CVData}
 */
function createEmptyCVData() {
    return {
        version: '2.0',
        lastModified: new Date().toISOString(),

        // Personal Info
        personal: {
            fullName: I18n.t('mock.fullName'),
            title: I18n.t('mock.title'),
            photo: null // Base64 or URL
        },

        // Contact
        contact: {
            location: I18n.t('mock.location'),
            phone: I18n.t('mock.phone'),
            email: I18n.t('mock.email'),
            linkedin: I18n.t('mock.linkedin'),
            website: '',
            github: ''
        },

        // About / Summary
        summary: I18n.t('mock.summary'),

        // Skills with levels (0-100)
        skills: [
            { id: 'skill-1', name: I18n.t('mock.skill1'), level: 85 },
            { id: 'skill-2', name: I18n.t('mock.skill2'), level: 90 },
            { id: 'skill-3', name: I18n.t('mock.skill3'), level: 75 }
        ],

        // Languages
        languages: [
            { id: 'lang-1', name: I18n.t('mock.lang1'), level: I18n.t('mock.lang1Level') },
            { id: 'lang-2', name: I18n.t('mock.lang2'), level: I18n.t('mock.lang2Level') }
        ],

        // Work Experience
        jobs: [
            {
                id: 'job-1',
                title: I18n.t('mock.jobTitle'),
                company: I18n.t('mock.jobCompany'),
                startDate: I18n.t('mock.jobStart'),
                endDate: I18n.t('mock.jobEnd'),
                current: true,
                description: [
                    I18n.t('mock.jobDesc1'),
                    I18n.t('mock.jobDesc2')
                ]
            }
        ],

        // Education
        education: [
            {
                id: 'edu-1',
                degree: I18n.t('mock.eduDegree'),
                school: I18n.t('mock.eduSchool'),
                startDate: I18n.t('mock.eduStart'),
                endDate: I18n.t('mock.eduEnd'),
                description: ''
            }
        ],

        // Projects & Certifications
        certifications: [
            {
                id: 'cert-1',
                name: I18n.t('mock.certName'),
                issuer: I18n.t('mock.certIssuer'),
                date: I18n.t('mock.certDate'),
                url: ''
            }
        ],

        // Hobbies / Interests
        hobbies: [
            { id: 'hobby-1', name: I18n.t('mock.hobby1') },
            { id: 'hobby-2', name: I18n.t('mock.hobby2') }
        ],

        // References
        references: I18n.t('mock.references'),

        // Settings
        settings: {
            theme: 'academic',
            showPhoto: true,
            showCertifications: true,
            showHobbies: true,
            showReferences: true,
            skillDisplayStyle: 'bar'
        }
    };
}

// ============================================
// UNIQUE ID GENERATOR
// ============================================

function generateId(prefix = 'item') {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================
// STATE MANAGEMENT
// ============================================

const CVState = {
    _data: null,
    _listeners: [],
    _saveTimeout: null,

    /**
     * Initialize state from localStorage or defaults
     */
    init() {
        try {
            const saved = localStorage.getItem('cv_data_v5');
            if (saved) {
                this._data = JSON.parse(saved);
                // Merge with defaults for any missing fields
                this._data = this._mergeWithDefaults(this._data);
            } else {
                this._data = createEmptyCVData();
            }
        } catch (e) {
            console.error('Failed to load/parse data:', e);
            this._data = createEmptyCVData();
        }
        return this._data;
    },

    /**
     * Merge saved data with defaults (for forward compatibility)
     */
    _mergeWithDefaults(saved) {
        const defaults = createEmptyCVData();
        return {
            ...defaults,
            ...saved,
            personal: { ...defaults.personal, ...saved.personal },
            contact: { ...defaults.contact, ...saved.contact },
            settings: { ...defaults.settings, ...saved.settings }
        };
    },

    /**
     * Get current state
     */
    get() {
        return this._data;
    },

    /**
     * Update state and notify listeners
     */
    set(path, value) {
        this._setNestedValue(this._data, path, value);
        this._data.lastModified = new Date().toISOString();
        this._notifyListeners(path, value);
        this._scheduleSave();
    },

    /**
     * Set nested value by path string (e.g., 'personal.fullName')
     */
    _setNestedValue(obj, path, value) {
        const keys = path.split('.');
        let current = obj;

        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];

            // Critical Fix: Handle Array traversal using ID string
            if (Array.isArray(current)) {
                // Try to find item with matching ID
                const item = current.find(x => x.id === key);
                if (item) {
                    current = item;
                    continue;
                }
            }

            if (!(key in current)) {
                // If we're stuck, we might be trying to access a property that doesn't exist
                // or we are at specific array index logic that isn't supported yet.
                // For safety, we initialize as object if missing.
                current[key] = {};
            }
            current = current[key];
        }

        // Final assignment
        const lastKey = keys[keys.length - 1];
        if (Array.isArray(current)) {
            const foundItem = current.find(item => item.id === lastKey);
            if (foundItem) {
                // We can't replace the item object itself easily here because we need the reference to the array
                // But usually we set properties OF an item (e.g. jobs.job-1.title).
                // If the path ends in an ID (e.g. jobs.job-1), we assume we want to replace the whole object?
                // That's rare in this app. Usually we are at 'title' or 'company'.
                // BUT if we reached here, 'current' is the array. 
                // It's ambiguous. Let's assume the previous loop handled the ID resolution if it was a parent.
                // If we are here, 'current' is likely the object containing the property 'lastKey'.
                // Wait, if the loop logic above worked, 'current' should be the object (e.g. the job object),
                // and 'lastKey' is 'title'.
                // UNLESS the path was just 'jobs', which is handled by top-level state setters usually.
            }
        }

        current[lastKey] = value;
    },

    /**
     * Get nested value by path string
     */
    getByPath(path) {
        const keys = path.split('.');
        let current = this._data;
        for (const key of keys) {
            if (current === undefined || current === null) return undefined;
            current = current[key];
        }
        return current;
    },

    /**
     * Add item to array (skills, jobs, etc.)
     */
    addItem(arrayPath, item) {
        const arr = this.getByPath(arrayPath);
        if (Array.isArray(arr)) {
            arr.push(item);
            this._data.lastModified = new Date().toISOString();
            this._notifyListeners(arrayPath, arr);
            this._scheduleSave();
        }
    },

    /**
     * Remove item from array by ID
     */
    removeItem(arrayPath, itemId) {
        const arr = this.getByPath(arrayPath);
        if (Array.isArray(arr)) {
            const index = arr.findIndex(item => item.id === itemId);
            if (index > -1) {
                arr.splice(index, 1);
                this._data.lastModified = new Date().toISOString();
                this._notifyListeners(arrayPath, arr);
                this._scheduleSave();
            }
        }
    },

    /**
     * Update item in array by ID
     */
    updateItem(arrayPath, itemId, updates) {
        const arr = this.getByPath(arrayPath);
        if (Array.isArray(arr)) {
            const item = arr.find(item => item.id === itemId);
            if (item) {
                Object.assign(item, updates);
                this._data.lastModified = new Date().toISOString();
                this._notifyListeners(arrayPath, arr);
                this._scheduleSave();
            }
        }
    },

    /**
     * Move item in array (for drag & drop)
     */
    moveItem(arrayPath, fromIndex, toIndex) {
        const arr = this.getByPath(arrayPath);
        if (Array.isArray(arr) && fromIndex >= 0 && toIndex >= 0 && fromIndex < arr.length && toIndex < arr.length) {
            const [item] = arr.splice(fromIndex, 1);
            arr.splice(toIndex, 0, item);
            this._data.lastModified = new Date().toISOString();
            this._notifyListeners(arrayPath, arr);
            this._scheduleSave();
        }
    },

    /**
     * Subscribe to state changes
     */
    subscribe(callback) {
        this._listeners.push(callback);
        return () => {
            this._listeners = this._listeners.filter(cb => cb !== callback);
        };
    },

    /**
     * Notify all listeners
     */
    _notifyListeners(path, value) {
        this._listeners.forEach(cb => cb(path, value, this._data));
    },

    /**
     * Schedule save to localStorage (debounced)
     */
    _scheduleSave() {
        if (this._saveTimeout) {
            clearTimeout(this._saveTimeout);
        }
        this._saveTimeout = setTimeout(() => {
            this._save();
        }, 500);
    },

    /**
     * Save to localStorage
     */
    _save() {
        try {
            localStorage.setItem('cv_data_v5', JSON.stringify(this._data));
        } catch (e) {
            console.error('Failed to save:', e);
        }
    },

    /**
     * Force immediate save
     */
    saveNow() {
        if (this._saveTimeout) {
            clearTimeout(this._saveTimeout);
        }
        this._save();
    },

    /**
     * Export as JSON
     */
    exportJSON() {
        return JSON.stringify(this._data, null, 2);
    },

    /**
     * Import from JSON
     */
    importJSON(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            this._data = this._mergeWithDefaults(data);
            this._save();
            this._notifyListeners('*', this._data);
            return true;
        } catch (e) {
            console.error('Import failed:', e);
            return false;
        }
    },

    /**
     * Reset to defaults
     */
    reset() {
        this._data = createEmptyCVData();
        this._save();
        this._notifyListeners('*', this._data);
    }
};

// ============================================
// EXPORT FOR USE
// ============================================
window.CVState = CVState;
window.generateId = generateId;
window.createEmptyCVData = createEmptyCVData;
