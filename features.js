/**
 * CV PRO - Advanced Features
 * Photo Upload, Drag & Drop, PDF Export
 */

// ============================================
// PHOTO UPLOAD MODULE
// ============================================

const PhotoUpload = {
    currentImage: null,
    maxFileSize: 15 * 1024 * 1024, // 15MB max (Compresses automatically)

    init() {
        // Listen for photo container clicks
        document.addEventListener('click', (e) => {
            if (e.target.closest('.photo-container')) {
                this.openUploadModal();
            }
        });
    },

    openUploadModal() {
        const modal = document.getElementById('photo-modal');
        if (modal) {
            // Load current photo if exists
            const data = CVState.get();
            if (data.personal?.photo) {
                this.currentImage = data.personal.photo;
                this.showPreview(data.personal.photo);
            } else {
                this.resetPreview();
            }
            modal.classList.add('active');
            this.setupDropZone();
        }
    },

    closeModal() {
        const modal = document.getElementById('photo-modal');
        if (modal) {
            modal.classList.remove('active');
            this.resetPreview();
            this.currentImage = null;
        }
    },

    resetPreview() {
        const preview = document.getElementById('photo-preview');
        const dropZone = document.getElementById('photo-drop-zone');
        const controls = document.getElementById('photo-controls');

        if (preview) {
            preview.innerHTML = '';
            preview.style.display = 'none';
        }
        if (dropZone) dropZone.style.display = 'block';
        if (controls) controls.style.display = 'none';
    },

    setupDropZone() {
        const dropZone = document.getElementById('photo-drop-zone');
        const fileInput = document.getElementById('photo-file-input');

        if (!dropZone || !fileInput) return;

        // Click to select
        dropZone.onclick = () => fileInput.click();

        // Drag events
        dropZone.ondragover = (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        };

        dropZone.ondragleave = () => {
            dropZone.classList.remove('dragover');
        };

        dropZone.ondrop = (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) {
                this.validateAndProcess(file);
            }
        };

        // File input change
        fileInput.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                this.validateAndProcess(file);
            }
            // Reset input for re-selection
            fileInput.value = '';
        };
    },

    validateAndProcess(file) {
        // Check file size
        if (file.size > this.maxFileSize) {
            CVApp.showNotify('Dosya çok büyük! Max 15MB');
            return;
        }

        // Check file type
        if (!file.type.match(/^image\/(jpeg|png|gif|webp)$/)) {
            CVApp.showNotify('Sadece resim dosyaları kabul edilir');
            return;
        }

        this.processImage(file);
    },

    processImage(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            // Compress if needed
            this.compressImage(e.target.result, (compressed) => {
                this.currentImage = compressed;
                this.showPreview(compressed);
            });
        };
        reader.readAsDataURL(file);
    },

    compressImage(dataUrl, callback) {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const maxSize = 300; // Max dimension

            let width = img.width;
            let height = img.height;

            // Scale down if needed
            if (width > maxSize || height > maxSize) {
                if (width > height) {
                    height = (height / width) * maxSize;
                    width = maxSize;
                } else {
                    width = (width / height) * maxSize;
                    height = maxSize;
                }
            }

            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            callback(canvas.toDataURL('image/jpeg', 0.85));
        };
        img.src = dataUrl;
    },

    showPreview(src) {
        const preview = document.getElementById('photo-preview');
        const dropZone = document.getElementById('photo-drop-zone');
        const controls = document.getElementById('photo-controls');

        if (preview && dropZone) {
            preview.innerHTML = `<img src="${src}" alt="Preview" style="max-width:200px; max-height:200px; border-radius:50%; object-fit:cover;">`;
            preview.style.display = 'block';
            dropZone.style.display = 'none';
            if (controls) controls.style.display = 'flex';
        }
    },

    changePhoto() {
        const fileInput = document.getElementById('photo-file-input');
        if (fileInput) fileInput.click();
    },

    savePhoto() {
        if (this.currentImage) {
            CVState.set('personal.photo', this.currentImage);
            CVApp.renderCV();
            this.closeModal();
            CVApp.showNotify('Fotoğraf kaydedildi!');
        } else {
            CVApp.showNotify('Önce bir fotoğraf seçin');
        }
    },

    removePhoto() {
        CVState.set('personal.photo', null);
        this.currentImage = null;
        CVApp.renderCV();
        this.resetPreview();
        CVApp.showNotify('Fotoğraf kaldırıldı!');
    }
};

// ============================================
// DRAG & DROP SORTING
// ============================================

const DragSort = {
    draggedItem: null,
    sourceContainer: null,

    init() {
        this.setupContainers();
    },

    rebind() {
        this.setupContainers();
    },

    setupContainers() {
        // Direct listener attachment (more robust than delegation for this specific case)
        const containers = ['jobs-container', 'edu-container', 'cert-container', 'skills-container', 'languages-container', 'hobbies-container'];

        containers.forEach(id => {
            const container = document.getElementById(id);
            if (container) {
                // Remove old listeners to be safe (though innerHTML nuke usually clears them)
                // cloning node is a cheap way to strip listeners if we reused elements, but we don't.

                this.setupContainer(container);
            }
        });
    },

    setupContainer(container) {
        container.addEventListener('dragstart', (e) => {
            const item = e.target.closest('[draggable="true"]');
            if (!item) return;

            this.draggedItem = item;
            this.sourceContainer = container;
            item.classList.add('sortable-chosen');

            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', item.dataset.id);
        });

        container.addEventListener('dragend', (e) => {
            if (this.draggedItem) {
                this.draggedItem.classList.remove('sortable-chosen');
                this.draggedItem = null;
            }
        });

        container.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';

            const draggable = this.draggedItem;
            if (!draggable) return;

            // Strict check: only allow sorting within same container
            if (container !== this.sourceContainer) return;

            const afterElement = this.getDragAfterElement(container, e.clientY);

            if (afterElement == null) {
                container.appendChild(draggable);
            } else {
                container.insertBefore(draggable, afterElement);
            }
        });

        container.addEventListener('drop', (e) => {
            e.preventDefault();
            if (this.draggedItem && this.sourceContainer === container) {
                this.saveNewOrder(container);
            }
        });
    },

    getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('[draggable="true"]:not(.sortable-chosen)')];

        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;

            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    },

    saveNewOrder(container) {
        const items = [...container.querySelectorAll('[data-id]')];
        const newOrder = items.map(item => item.dataset.id);

        // Map container ID to data path
        const pathMap = {
            'jobs-container': 'jobs',
            'edu-container': 'education',
            'cert-container': 'certifications',
            'skills-container': 'skills',
            'languages-container': 'languages',
            'hobbies-container': 'hobbies'
        };

        const path = pathMap[container.id];
        if (!path) return;

        // Reorder the array in state
        const currentArray = CVState.getByPath(path);
        if (!currentArray) return;

        const reordered = newOrder.map(id =>
            currentArray.find(item => item.id === id)
        ).filter(Boolean);

        CVState.set(path, reordered);
        CVApp.showNotify('Sıralama güncellendi!');
    }
};

// ============================================
// PDF EXPORT
// ============================================

const PDFExport = {
    async export() {


        // Check if html2pdf is loaded
        if (typeof html2pdf === 'undefined') {
            // Fallback to print
            window.print();
            return;
        }

        this.showProgress();

        const element = document.getElementById('cv-content');
        if (!element) {
            this.hideProgress();
            return;
        }

        // Clone and prepare for PDF
        const clone = element.cloneNode(true);

        // Remove interactive elements
        clone.querySelectorAll('.btn-add, .delete-btn, .drag-handle').forEach(el => el.remove());

        const opt = {
            margin: 0,
            filename: 'CV_' + new Date().toISOString().split('T')[0] + '.pdf',
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: {
                scale: 2,
                useCORS: true,
                letterRendering: true
            },
            jsPDF: {
                unit: 'mm',
                format: 'a4',
                orientation: 'portrait'
            }
        };

        try {
            await html2pdf().set(opt).from(clone).save();
            CVApp.showNotify('PDF indirildi!');
        } catch (error) {
            console.error('PDF export failed:', error);
            CVApp.showNotify('PDF hatası, yazdırma açılıyor...');
            window.print();
        } finally {
            this.hideProgress();
        }
    },

    showProgress() {
        const progress = document.getElementById('pdf-progress');
        if (progress) progress.classList.add('active');
    },

    hideProgress() {
        const progress = document.getElementById('pdf-progress');
        if (progress) progress.classList.remove('active');
    }
};

// ============================================
// PWA INSTALLER
// ============================================

const PWAInstaller = {
    deferredPrompt: null,

    init() {
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
            this.showInstallButton();
        });

        window.addEventListener('appinstalled', () => {
            this.hideInstallButton();
            this.deferredPrompt = null;
        });

        // Check for iOS
        this.checkIOS();
    },

    checkIOS() {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        const isStandalone = window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;

        if (isIOS && !isStandalone) {
            // Show a small hint after a delay
            setTimeout(() => this.showIOSHint(), 3000);
        }
    },

    showIOSHint() {
        // Check if already shown in this session to avoid annoyance
        if (sessionStorage.getItem('ios-prompt-shown')) return;

        const hint = document.createElement('div');
        hint.className = 'ios-prompt';
        hint.innerHTML = `
            <div style="position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); background: white; padding: 15px; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.2); z-index: 9999; max-width: 90%; width: 340px; text-align: center; font-family: 'Inter', sans-serif;">
                <button onclick="this.parentElement.parentElement.remove()" style="position: absolute; top: 5px; right: 10px; border: none; background: none; font-size: 20px; color: #999;">&times;</button>
                <p style="margin: 0 0 10px; font-weight: 600; color: #333;">Uygulamayı Yükle 📲</p>
                <p style="margin: 0; font-size: 13px; color: #666; line-height: 1.5;">
                    iPhone'una kurmak için: <br>
                    Tarayıcı menüsündeki <strong style="color: #007bff"><i class="fas fa-share-square"></i> Paylaş</strong> butonuna bas ve <br>
                    <strong>"Ana Ekrana Ekle"</strong> seçeneğini seç.
                </p>
            </div>
        `;
        document.body.appendChild(hint);
        sessionStorage.setItem('ios-prompt-shown', 'true');
    },

    showInstallButton() {
        const btn = document.getElementById('pwa-install-btn');
        if (btn) btn.style.display = 'inline-flex';
    },

    hideInstallButton() {
        const btn = document.getElementById('pwa-install-btn');
        if (btn) btn.style.display = 'none';
    },

    async install() {
        if (!this.deferredPrompt) return;
        this.deferredPrompt.prompt();
        const { outcome } = await this.deferredPrompt.userChoice;
        this.deferredPrompt = null;
        this.deferredPrompt = null;
        this.hideInstallButton();
    }
};

// ============================================
// NATIVE SHARE
// ============================================

const NativeShare = {
    async sharePDF(blob, filename) {
        if (navigator.share && navigator.canShare) {
            const file = new File([blob], filename, { type: 'application/pdf' });
            if (navigator.canShare({ files: [file] })) {
                try {
                    await navigator.share({
                        files: [file],
                        title: 'My CV',
                        text: 'Created with CV Pro'
                    });
                    CVApp.showNotify('CV Paylaşıldı!');
                    return true;
                } catch (error) {
                    if (error.name !== 'AbortError') {
                        console.error('Share failed:', error);
                    }
                }
            }
        }
        return false; // Fallback needed
    }
};

// ============================================
// INITIALIZE FEATURES
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Wait for main app to initialize
    setTimeout(() => {
        PhotoUpload.init();
        DragSort.init();
        PWAInstaller.init();
    }, 100);
});

// Export for global access
window.PhotoUpload = PhotoUpload;
window.DragSort = DragSort;
window.PDFExport = PDFExport;
window.PWAInstaller = PWAInstaller;
window.NativeShare = NativeShare;
