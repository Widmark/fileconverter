/**
 * Huvudlogik för PAXML till Hogia Lön konverterare.
 */

(function () {
    const mainContainer = document.getElementById('main-container');
    const uploadView = document.getElementById('upload-view');
    const reviewView = document.getElementById('review-view');
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const chooseFileBtn = document.getElementById('choose-file-btn');
    const fileInfo = document.getElementById('file-info');
    const fileName = document.getElementById('file-name');
    const clearFileBtn = document.getElementById('clear-file-btn');
    const errorMessage = document.getElementById('error-message');
    const reviewBtn = document.getElementById('review-btn');

    let selectedFile = null;
    let appState = null;

    function showError(msg) {
        errorMessage.textContent = msg;
        errorMessage.hidden = false;
    }

    function hideError() {
        errorMessage.hidden = true;
    }

    function setFile(file) {
        selectedFile = file;
        if (file) {
            fileName.textContent = file.name;
            fileInfo.hidden = false;
            reviewBtn.disabled = false;
        } else {
            fileInfo.hidden = true;
            reviewBtn.disabled = true;
        }
        hideError();
    }

    function readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('Kunde inte läsa filen.'));
            reader.readAsText(file, 'UTF-8');
        });
    }

    function downloadWli(content) {
        const normalizedContent = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n/g, '\r\n');
        const encoded = WliBuilder.encodeWindows1252(normalizedContent);
        const blob = new Blob([encoded], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'output.wli';
        a.click();
        URL.revokeObjectURL(url);
    }

    function downloadXml(content, filename) {
        const blob = new Blob([content], { type: 'application/xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    function showUploadView() {
        uploadView.hidden = false;
        reviewView.hidden = true;
        if (mainContainer) mainContainer.classList.remove('review-mode');
        appState = null;
        setFile(null);
        fileInput.value = '';
    }

    function showReviewView(state) {
        appState = state;
        uploadView.hidden = true;
        reviewView.hidden = false;
        if (mainContainer) mainContainer.classList.add('review-mode');
        renderReview(state);
    }

    function renderReview(state) {
        if (!state) return;
        ReviewView.render(state, renderReview, handleAction);
    }

    async function handleAction(action) {
        if (action === 'newFile') {
            showUploadView();
            return;
        }
        if (action === 'exportWli') {
            const { fileInfo: fi, transactions } = AppState.getSelectedForExport(appState);
            const transformed = Transformer.transformAll(transactions);
            const content = WliBuilder.buildWliContent(fi, transformed);
            try {
                const res = await fetch('/api/export-wli', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ fileInfo: fi, transactions })
                });
                if (res.ok) {
                    const blob = await res.blob();
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'output.wli';
                    a.click();
                    URL.revokeObjectURL(url);
                    return;
                }
            } catch (_) {}
            downloadWli(content);
            return;
        }
        if (action === 'exportPaxml') {
            const { fileInfo: fi, transactions, employeeNames } = AppState.getSelectedForExport(appState);
            const content = PaxmlBuilder.buildPaxml23(fi, transactions, employeeNames);
            downloadXml(content, 'output.paxml');
            return;
        }
    }

    async function loadAndReview() {
        if (!selectedFile) return;

        hideError();

        try {
            const xmlString = await readFileAsText(selectedFile);
            const { fileInfo: parsedFileInfo, transactions, employeeNames } = PAXMLParser.parse(xmlString);
            const state = AppState.buildState(parsedFileInfo, transactions, employeeNames);
            showReviewView(state);
        } catch (err) {
            showError(err.message || 'Ett oväntat fel uppstod.');
        }
    }

    chooseFileBtn.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const ext = file.name.toLowerCase().split('.').pop();
            if (ext !== 'xml' && ext !== 'paxml') {
                showError('Välj en XML- eller PAXML-fil (.xml, .paxml)');
                return;
            }
            setFile(file);
        }
        fileInput.value = '';
    });

    dropZone.addEventListener('click', (e) => {
        if (e.target !== fileInput && e.target !== chooseFileBtn) {
            fileInput.click();
        }
    });

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (file) {
            const ext = file.name.toLowerCase().split('.').pop();
            if (ext !== 'xml' && ext !== 'paxml') {
                showError('Släpp en XML- eller PAXML-fil (.xml, .paxml)');
                return;
            }
            setFile(file);
        }
    });

    clearFileBtn.addEventListener('click', () => {
        setFile(null);
        fileInput.value = '';
    });

    reviewBtn.addEventListener('click', loadAndReview);
})();
