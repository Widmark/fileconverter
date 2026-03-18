/**
 * Granskningsvy för interaktiv PAXML-granskare.
 */

const ReviewView = {
    render(state, onUpdate, onAction) {
        const container = document.getElementById('review-container');
        if (!container) return;

        onAction = onAction || (() => {});

        container.innerHTML = `
            <section class="overview-panel card">
                <h2>Filinformation</h2>
                <dl class="overview-list">
                    <dt>Företag</dt><dd>${escapeHtml(state.fileInfo.companyName || '–')}</dd>
                    <dt>Källa</dt><dd>${escapeHtml(state.fileInfo.softwareProduct || '–')}</dd>
                    <dt>Skapandedatum</dt><dd>${escapeHtml(state.fileInfo.createdDate || '–')}</dd>
                </dl>
                <p class="overview-stats">Antal anställda: ${state.employees.length} | Antal transaktioner: ${state.employees.reduce((s, e) => s + e.transactions.length, 0)}</p>
            </section>

            <section class="filter-section card">
                <h2>Tidskodsfilter</h2>
                <p class="filter-hint">Bocka ur tidskoder för att exkludera från export.</p>
                <div class="filter-checkboxes" id="pay-type-filters"></div>
            </section>

            <section class="employee-section">
                <h2>Anställda</h2>
                <div class="employee-list" id="employee-list"></div>
            </section>

            <section class="summary-section card">
                <p class="summary-text" id="summary-text"></p>
                <div class="export-buttons">
                    <button type="button" id="export-wli-btn" class="btn btn-primary">Generera Hogia-fil (.wli)</button>
                    <button type="button" id="export-paxml-btn" class="btn btn-secondary">Generera PAXML 2.3 (.paxml)</button>
                    <button type="button" id="new-file-btn" class="btn btn-secondary">Ladda upp ny fil</button>
                </div>
            </section>
        `;

        this._renderPayTypeFilters(container, state, onUpdate);
        this._renderEmployeeList(container, state, onUpdate);
        this._updateSummary(container, state);
        this._bindExportButtons(container, onAction);
    },

    _renderPayTypeFilters(container, state, onUpdate) {
        const el = container.querySelector('#pay-type-filters');
        const payTypes = AppState.getUniquePayTypes(state);
        el.innerHTML = payTypes.map(pt => {
            const checked = state.payTypeFilter[pt] !== false ? 'checked' : '';
            const label = getPayTypeName(pt);
            const display = label !== pt ? `${pt} (${label})` : pt;
            return `<label class="filter-checkbox"><input type="checkbox" data-paytype="${escapeHtml(pt)}" ${checked}> ${escapeHtml(display)}</label>`;
        }).join('');

        el.querySelectorAll('input').forEach(cb => {
            cb.addEventListener('change', () => {
                AppState.setPayTypeFilter(state, cb.dataset.paytype, cb.checked);
                onUpdate(state);
            });
        });
    },

    _renderEmployeeList(container, state, onUpdate) {
        const el = container.querySelector('#employee-list');
        const expanded = this._expandedEmployees || new Set();

        el.innerHTML = state.employees.map(emp => {
            const totalQty = AppState.getEmployeeTotalQuantity(emp);
            const summary = AppState.getEmployeePayTypeSummary(emp);
            const isExpanded = expanded.has(emp.employmentId);
            const empChecked = emp.selected ? 'checked' : '';
            const displayName = (emp.name || emp.employmentId).trim() || emp.employmentId;

            const summaryChips = summary.map(({ code, qty, allSelected }) => {
                const name = getPayTypeName(code);
                const chipClass = allSelected ? 'summary-chip' : 'summary-chip summary-chip-excluded';
                return `<span class="${chipClass}" data-emp-id="${escapeHtml(emp.employmentId)}" data-paytype="${escapeHtml(code)}" role="button" tabindex="0" title="Klicka för att avmarkera/markera">${escapeHtml(name)} <span class="chip-value">${qty.toFixed(1)} h</span></span>`;
            }).join('');

            const transRows = emp.transactions.map(tx => {
                const excluded = AppState.isTransactionExcludedByFilter(state, tx);
                const txChecked = tx.selected && !excluded ? 'checked' : '';
                const disabled = excluded ? 'disabled' : '';
                const rowClass = excluded ? 'transaction-excluded' : '';
                const payTypeLabel = getPayTypeName(tx.convertedPayTypeId);

                return `
                    <tr class="${rowClass}">
                        <td><input type="checkbox" data-trans-id="${escapeHtml(tx.id)}" ${txChecked} ${disabled}></td>
                        <td>${formatDate(tx.raw.periodStartDate)}</td>
                        <td>${formatDate(tx.raw.periodEndDate)}</td>
                        <td><span class="pay-type-cell"><span class="pay-type-name">${escapeHtml(payTypeLabel)}</span><span class="pay-type-code">${escapeHtml(tx.convertedPayTypeId)}</span></span></td>
                        <td>${tx.raw.quantity != null && !isNaN(tx.raw.quantity) ? tx.raw.quantity : '–'}</td>
                        <td>${tx.raw.price != null && !isNaN(tx.raw.price) ? tx.raw.price : '–'}</td>
                        <td>${tx.raw.amount != null && !isNaN(tx.raw.amount) ? tx.raw.amount : '–'}</td>
                        <td>${escapeHtml(tx.raw.note || '')}</td>
                    </tr>
                `;
            }).join('');

            return `
                <div class="employee-item card" data-employment-id="${escapeHtml(emp.employmentId)}">
                    <div class="employee-row ${isExpanded ? 'expanded' : ''}" data-toggle>
                        <input type="checkbox" data-emp-id="${escapeHtml(emp.employmentId)}" ${empChecked}>
                        <span class="employee-display">${escapeHtml(displayName)}</span>
                        <span class="employee-id-hint">${emp.name ? '#' + escapeHtml(emp.employmentId) : ''}</span>
                        <span class="employee-total">${totalQty.toFixed(1)} tim</span>
                        <span class="expand-icon">${isExpanded ? '▼' : '▶'}</span>
                    </div>
                    <div class="employee-detail" style="display: ${isExpanded ? 'block' : 'none'}">
                        <div class="employee-summary">
                            <h3>Summering per tidsart</h3>
                            <div class="summary-chips">${summaryChips || '<span class="no-summary">Inga valda transaktioner</span>'}</div>
                        </div>
                        <div class="transaction-detail">
                            <h3>Transaktioner</h3>
                            <table class="transaction-table">
                                <thead>
                                    <tr>
                                        <th></th>
                                        <th>Från</th>
                                        <th>Till</th>
                                        <th>Tidskod</th>
                                        <th>Antal</th>
                                        <th>Pris</th>
                                        <th>Belopp</th>
                                        <th>Anmärkning</th>
                                    </tr>
                                </thead>
                                <tbody>${transRows}</tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        el.querySelectorAll('[data-toggle]').forEach(row => {
            row.addEventListener('click', (e) => {
                if (e.target.type === 'checkbox') return;
                const empId = row.closest('.employee-item').dataset.employmentId;
                if (expanded.has(empId)) {
                    expanded.delete(empId);
                } else {
                    expanded.add(empId);
                }
                onUpdate(state);
            });
        });

        el.querySelectorAll('input[data-emp-id]').forEach(cb => {
            cb.addEventListener('click', e => e.stopPropagation());
            cb.addEventListener('change', () => {
                AppState.setEmployeeSelected(state, cb.dataset.empId, cb.checked);
                onUpdate(state);
            });
        });

        el.querySelectorAll('input[data-trans-id]').forEach(cb => {
            cb.addEventListener('change', () => {
                if (cb.disabled) return;
                AppState.setTransactionSelected(state, cb.dataset.transId, cb.checked);
                onUpdate(state);
            });
        });

        el.querySelectorAll('.summary-chip').forEach(chip => {
            const empId = chip.dataset.empId;
            const payType = chip.dataset.paytype;
            if (!empId || !payType) return;
            chip.addEventListener('click', () => {
                AppState.togglePersonPayTypeSelection(state, empId, payType);
                onUpdate(state);
            });
            chip.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    AppState.togglePersonPayTypeSelection(state, empId, payType);
                    onUpdate(state);
                }
            });
        });

        this._expandedEmployees = expanded;
    },

    _updateSummary(container, state) {
        const { selectedEmployees, selectedTransactions } = AppState.getSelectionCounts(state);
        const el = container.querySelector('#summary-text');
        if (el) el.textContent = `Valda anställda: ${selectedEmployees} | Valda transaktioner: ${selectedTransactions}`;
    },

    _bindExportButtons(container, onAction) {
        const wliBtn = container.querySelector('#export-wli-btn');
        const paxmlBtn = container.querySelector('#export-paxml-btn');
        const newBtn = container.querySelector('#new-file-btn');

        if (wliBtn) wliBtn.addEventListener('click', () => onAction('exportWli'));
        if (paxmlBtn) paxmlBtn.addEventListener('click', () => onAction('exportPaxml'));
        if (newBtn) newBtn.addEventListener('click', () => onAction('newFile'));
    }
};

function escapeHtml(str) {
    if (str == null) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function formatDate(isoDate) {
    if (!isoDate || typeof isoDate !== 'string') return '–';
    const t = isoDate.trim();
    return t.length >= 10 ? t.substring(0, 10) : '–';
}
