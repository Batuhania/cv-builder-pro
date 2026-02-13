/**
 * CV PRO - Render Engine
 * Transforms CV Data into HTML
 */

// ============================================
// TEMPLATE HELPERS
// ============================================

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    if (!text) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, m => map[m]);
}

/**
 * Create element from template string
 */
function htmlToElement(html) {
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    return template.content.firstChild;
}

// ============================================
// COMPONENT RENDERERS
// ============================================

const CVRenderer = {
    /**
     * Render entire CV from data
     */
    render(data, container) {
        if (!container) return;

        const skillStyle = data.settings?.skillDisplayStyle || 'bar';

        // Build HTML
        const html = `
            <div class="left-column">
                ${this.renderPersonal(data.personal, data.settings?.showPhoto)}
                ${this.renderContact(data.contact)}
                ${this.renderSkills(data.skills, skillStyle)}
                ${this.renderLanguages(data.languages)}
                ${this.renderHobbies(data.hobbies, data.settings?.showHobbies)}
            </div>
            <div class="right-column">
                ${this.renderSummary(data.summary)}
                ${this.renderJobs(data.jobs)}
                ${this.renderEducation(data.education)}
                ${this.renderCertifications(data.certifications, data.settings?.showCertifications)}
                ${this.renderReferences(data.references, data.settings?.showReferences)}
            </div>
        `;

        container.innerHTML = html;

        // Re-bind drag events to new DOM elements
        if (window.DragSort && typeof window.DragSort.rebind === 'function') {
            window.DragSort.rebind();
        }
    },

    /**
     * Convert skill level (0-100) to text label
     */
    _levelToText(level) {
        if (level >= 90) return 'Expert';
        if (level >= 75) return 'Advanced';
        if (level >= 50) return 'Intermediate';
        if (level >= 25) return 'Beginner';
        return 'Novice';
    },

    /**
     * Render skill level indicator based on display style
     */
    _renderSkillLevel(skill, style) {
        const level = skill.level || 0;
        const textLevel = this._levelToText(level);
        const ariaLabel = `${skill.name} - ${textLevel} (${level}%)`;

        switch (style) {
            case 'blocks': {
                const filled = Math.round(level / 10);
                const empty = 10 - filled;
                const blocks = '█'.repeat(filled) + '░'.repeat(empty);
                return `<div class="skill-level-blocks" data-skill-id="${skill.id}" aria-label="${ariaLabel}" title="${textLevel} (${level}%)" style="cursor:pointer;">
                    <span class="blocks-visual">${blocks}</span>
                    <span class="blocks-text">${textLevel}</span>
                </div>`;
            }
            case 'stars': {
                const starCount = Math.round(level / 20);
                const starsHtml = Array.from({ length: 5 }, (_, i) =>
                    `<span class="star-icon" data-star-index="${i + 1}" style="cursor:pointer; font-size:14pt;">${i < starCount ? '⭐' : '☆'}</span>`
                ).join('');
                return `<div class="skill-level-stars" data-skill-id="${skill.id}" aria-label="${ariaLabel}" title="${textLevel} (${level}%)">
                    <span class="stars-visual">${starsHtml}</span>
                    <span class="stars-text">${textLevel}</span>
                </div>`;
            }
            case 'text':
                return `<div class="skill-level-text" data-skill-id="${skill.id}" aria-label="${ariaLabel}" style="cursor:pointer;" title="Tıklayarak seviye değiştir">
                    <span class="level-badge level-${textLevel.toLowerCase()}">${textLevel}</span>
                </div>`;
            case 'bar-text':
                return `<div class="skill-level-bartext" aria-label="${ariaLabel}">
                    <div class="progress-bar" data-skill-id="${skill.id}">
                        <div class="progress-fill" style="width: ${level}%;"></div>
                    </div>
                    <span class="bartext-label">${textLevel}</span>
                </div>`;
            case 'bar':
            default:
                return `<div class="progress-bar" data-skill-id="${skill.id}" aria-label="${ariaLabel}">
                    <div class="progress-fill" style="width: ${level}%;"></div>
                </div>`;
        }
    },

    /**
     * Render personal info section
     */
    renderPersonal(personal, showPhoto = false) {
        let photoHtml = '';

        if (showPhoto) {
            photoHtml = personal.photo
                ? `<div class="photo-container"><img src="${personal.photo}" alt="Profile"></div>`
                : `<div class="photo-container">
                     <div class="photo-placeholder">
                       <i class="fas fa-camera"></i>
                       <span>${I18n.t('ui.photoAdd')}</span>
                     </div>
                   </div>`;
        }

        return `
            <div data-section="personal">
                ${photoHtml}
                <h1 contenteditable="true" data-field="personal.fullName">${personal.fullName || ''}</h1>
                <div class="job-title-header" contenteditable="true" data-field="personal.title">${personal.title || ''}</div>
            </div>
        `;
    },

    /**
     * Render contact section
     */
    renderContact(contact) {
        return `
            <div class="section-title">${I18n.t('sections.contact')}</div>
            <div data-section="contact">
                <div class="contact-item">
                    <i class="fas fa-map-marker-alt"></i> 
                    <span contenteditable="true" data-field="contact.location">${contact.location || ''}</span>
                </div>
                <div class="contact-item">
                    <i class="fas fa-phone"></i> 
                    <span contenteditable="true" data-field="contact.phone">${contact.phone || ''}</span>
                </div>
                <div class="contact-item">
                    <i class="fas fa-envelope"></i> 
                    <span contenteditable="true" data-field="contact.email">${contact.email || ''}</span>
                </div>
                <div class="contact-item">
                    <i class="fab fa-linkedin"></i> 
                    <span contenteditable="true" data-field="contact.linkedin">${contact.linkedin || ''}</span>
                </div>
            </div>
        `;
    },

    /**
     * Render skills section
     */
    renderSkills(skills, displayStyle = 'bar') {
        const skillsHtml = skills.map(skill => `
            <div class="skill-item skill-style-${displayStyle}" data-id="${skill.id}" draggable="true">
                <div class="drag-handle" style="margin-right:8px; cursor:move; color:#ccc;"><i class="fas fa-grip-vertical"></i></div>
                <span class="delete-btn" data-delete="skills" data-item-id="${skill.id}">
                    <i class="fas fa-times"></i>
                </span>
                <div class="skill-name" contenteditable="true" data-field="skills.${skill.id}.name">${skill.name || ''}</div>
                ${this._renderSkillLevel(skill, displayStyle)}
            </div>
        `).join('');

        return `
            <div class="section-title">
                ${I18n.t('sections.skills')}
                <button class="btn-add" data-add="skill" title="${I18n.t('buttons.add')}">+</button>
            </div>
            <div id="skills-container" data-section="skills">
                ${skillsHtml}
            </div>
        `;
    },

    /**
     * Render languages section
     */
    renderLanguages(languages) {
        const langsHtml = languages.map(lang => `
            <div class="skill-item language-item" data-id="${lang.id}" draggable="true">
                <div class="drag-handle" style="margin-right:8px; cursor:move; color:#ccc;"><i class="fas fa-grip-vertical"></i></div>
                <span class="delete-btn" data-delete="languages" data-item-id="${lang.id}">
                    <i class="fas fa-times"></i>
                </span>
                <div class="skill-name" contenteditable="true" data-field="languages.${lang.id}.name">${lang.name || ''}</div>
                <div class="language-level" contenteditable="true" data-field="languages.${lang.id}.level">${lang.level || ''}</div>
            </div>
        `).join('');

        return `
            <div class="section-title">
                ${I18n.t('sections.languages')}
                <button class="btn-add" data-add="lang" title="${I18n.t('buttons.add')}">+</button>
            </div>
            <div id="languages-container" data-section="languages">
                ${langsHtml}
            </div>
        `;
    },

    /**
     * Render Hobbies section
     */
    renderHobbies(hobbies, show = true) {
        if (!show || !hobbies) return '';

        const hobbiesHtml = hobbies.map(hobby => `
            <div class="skill-item hobby-item" data-id="${hobby.id}" draggable="true">
                <div class="drag-handle" style="margin-right:8px; cursor:move; color:#ccc;"><i class="fas fa-grip-vertical"></i></div>
                <span class="delete-btn" data-delete="hobbies" data-item-id="${hobby.id}">
                    <i class="fas fa-times"></i>
                </span>
                <div class="skill-name" contenteditable="true" data-field="hobbies.${hobby.id}.name">${hobby.name || ''}</div>
            </div>
        `).join('');

        return `
            <div class="section-title">
                ${I18n.t('sections.hobbies')}
                <button class="btn-add" data-add="hobby" title="${I18n.t('buttons.add')}">+</button>
            </div>
            <div id="hobbies-container" data-section="hobbies">
                ${hobbiesHtml}
            </div>
        `;
    },

    /**
     * Render summary/about section
     */
    renderSummary(summary) {
        return `
            <div class="section-title" style="margin-top:0;">${I18n.t('sections.summary')}</div>
            <div class="summary" contenteditable="true" data-field="summary">${summary || ''}</div>
        `;
    },

    /**
     * Render jobs/experience section
     */
    renderJobs(jobs) {
        const jobsHtml = jobs.map(job => `
            <div class="experience-item" data-id="${job.id}" draggable="true">
                <div class="drag-handle" style="margin-right:8px; cursor:move; color:#ccc; position:absolute; right:30px; top:0;"><i class="fas fa-grip-vertical"></i></div>
                <span class="delete-btn" data-delete="jobs" data-item-id="${job.id}">
                    <i class="fas fa-times"></i>
                </span>
                <div class="exp-header">
                    <div class="exp-title" contenteditable="true" data-field="jobs.${job.id}.title">${job.title || ''}</div>
                    <div class="exp-date" contenteditable="true" data-field="jobs.${job.id}.date" data-start="${job.startDate || ''}" data-end="${job.endDate || ''}">${job.startDate || ''} - ${job.endDate || ''}</div>
                </div>
                <div class="exp-company" contenteditable="true" data-field="jobs.${job.id}.company">${job.company || ''}</div>
                <div contenteditable="true" data-field="jobs.${job.id}.description">
                    <ul>
                        ${job.description.map(item => `<li>${item || ''}</li>`).join('')}
                    </ul>
                </div>
            </div>
        `).join('');

        return `
            <div class="section-title">
                ${I18n.t('sections.experience')}
                <button class="btn-add" data-add="job" title="${I18n.t('buttons.add')}">+</button>
            </div>
            <div id="jobs-container" data-section="jobs">
                ${jobsHtml}
            </div>
        `;
    },

    /**
     * Render education section
     */
    renderEducation(education) {
        const eduHtml = education.map(edu => `
            <div class="education-item" data-id="${edu.id}" draggable="true">
                <div class="drag-handle" style="margin-right:8px; cursor:move; color:#ccc;"><i class="fas fa-grip-vertical"></i></div>
                <span class="delete-btn" data-delete="education" data-item-id="${edu.id}">
                    <i class="fas fa-times"></i>
                </span>
                <div class="exp-header">
                    <div class="exp-title" contenteditable="true" data-field="education.${edu.id}.degree">${edu.degree || ''}</div>
                    <div class="exp-date" contenteditable="true" data-field="education.${edu.id}.date" data-start="${edu.startDate || ''}" data-end="${edu.endDate || ''}">${edu.startDate || ''} - ${edu.endDate || ''}</div>
                </div>
                <div class="exp-company" contenteditable="true" data-field="education.${edu.id}.school">${edu.school || ''}</div>
            </div>
        `).join('');

        return `
            <div class="section-title">
                ${I18n.t('sections.education')}
                <button class="btn-add" data-add="edu" title="${I18n.t('buttons.add')}">+</button>
            </div>
            <div id="edu-container" data-section="education">
                ${eduHtml}
            </div>
        `;
    },

    /**
     * Render certifications section
     */
    renderCertifications(certifications, show = true) {
        if (!show) return '';

        const certsHtml = certifications.map(cert => `
            <div class="cert-item" data-id="${cert.id}" draggable="true">
                <div class="drag-handle" style="margin-right:8px; cursor:move; color:#ccc;"><i class="fas fa-grip-vertical"></i></div>
                <span class="delete-btn" data-delete="certifications" data-item-id="${cert.id}">
                    <i class="fas fa-times"></i>
                </span>
                <div class="exp-header">
                    <div class="exp-title" contenteditable="true" data-field="certifications.${cert.id}.name">${cert.name || ''}</div>
                    <div class="exp-date" contenteditable="true" data-field="certifications.${cert.id}.date">${cert.date || ''}</div>
                </div>
                <div class="exp-company" contenteditable="true" data-field="certifications.${cert.id}.issuer">${cert.issuer || ''}</div>
            </div>
        `).join('');

        return `
            <div class="section-title">
                ${I18n.t('sections.certifications')}
                <button class="btn-add" data-add="cert" title="${I18n.t('buttons.add')}">+</button>
            </div>
            <div id="cert-container" data-section="certifications">
                ${certsHtml}
            </div>
        `;
    },

    /**
     * Render references section
     */
    renderReferences(references, show = true) {
        if (!show) return '';

        return `
            <div class="section-title">${I18n.t('sections.references')}</div>
            <div contenteditable="true" data-field="references">${references || ''}</div>
        `;
    }
};

// ============================================
// EXPORT
// ============================================
window.CVRenderer = CVRenderer;
window.escapeHtml = escapeHtml;
