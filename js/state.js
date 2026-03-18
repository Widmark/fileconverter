/**
 * State-hantering för interaktiv PAXML-granskare.
 */

const AppState = {
    /**
     * Bygger state från parsad XML-data.
     * @param {object} fileInfo - { companyName, softwareProduct, createdDate }
     * @param {Array} transactions - Raw transaktioner från PAXMLParser
     * @param {object} employeeNames - { employmentId: name }
     * @returns {object} State-objekt
     */
    buildState(fileInfo, transactions, employeeNames = {}) {
        const byEmployee = {};
        let transIndex = 0;

        for (const tx of transactions) {
            const empId = tx.employmentId || '0';
            const convertedPayTypeId = Transformer.convertPayTypeId(tx.payTypeId);

            if (!byEmployee[empId]) {
                byEmployee[empId] = {
                    employmentId: empId,
                    name: employeeNames[empId] || '',
                    selected: true,
                    transactions: []
                };
            }

            byEmployee[empId].transactions.push({
                id: 'trans_' + transIndex++,
                raw: { ...tx },
                convertedPayTypeId,
                selected: true
            });
        }

        const employees = Object.values(byEmployee);
        const payTypeFilter = {};
        for (const emp of employees) {
            for (const tx of emp.transactions) {
                payTypeFilter[tx.convertedPayTypeId] = true;
            }
        }

        return {
            fileInfo: { ...fileInfo },
            payTypeFilter,
            employees,
            employeeNames
        };
    },

    /**
     * Returnerar sorterad lista av unika tidskoder (konverterade).
     */
    getUniquePayTypes(state) {
        const set = new Set();
        for (const emp of state.employees) {
            for (const tx of emp.transactions) {
                set.add(tx.convertedPayTypeId);
            }
        }
        return [...set].sort();
    },

    /**
     * Uppdaterar tidskodsfilter. Sätter selected = false på alla transaktioner med den tidskoden.
     */
    setPayTypeFilter(state, payTypeId, included) {
        state.payTypeFilter[payTypeId] = included;
        if (!included) {
            for (const emp of state.employees) {
                for (const tx of emp.transactions) {
                    if (tx.convertedPayTypeId === payTypeId) {
                        tx.selected = false;
                    }
                }
            }
        } else {
            for (const emp of state.employees) {
                for (const tx of emp.transactions) {
                    if (tx.convertedPayTypeId === payTypeId) {
                        tx.selected = true;
                    }
                }
            }
        }
    },

    /**
     * Sätter om en anställd är vald.
     */
    setEmployeeSelected(state, employmentId, selected) {
        const emp = state.employees.find(e => e.employmentId === employmentId);
        if (emp) emp.selected = selected;
    },

    /**
     * Sätter om en transaktion är vald.
     */
    setTransactionSelected(state, transactionId, selected) {
        for (const emp of state.employees) {
            const tx = emp.transactions.find(t => t.id === transactionId);
            if (tx) {
                tx.selected = selected;
                return;
            }
        }
    },

    /**
     * Returnerar data för export: endast valda transaktioner från valda anställda.
     */
    getSelectedForExport(state) {
        const transactions = [];
        for (const emp of state.employees) {
            if (!emp.selected) continue;
            for (const tx of emp.transactions) {
                if (tx.selected) {
                    transactions.push(tx.raw);
                }
            }
        }
        return {
            fileInfo: state.fileInfo,
            transactions,
            employeeNames: state.employeeNames || {}
        };
    },

    /**
     * Summerar kvantitet för valda transaktioner hos en anställd.
     */
    getEmployeeTotalQuantity(employee) {
        let sum = 0;
        for (const tx of employee.transactions) {
            if (tx.selected) {
                sum += tx.raw.quantity || 0;
            }
        }
        return sum;
    },

    /**
     * Kontrollerar om en transaktion är exkluderad av tidskodsfilter.
     */
    isTransactionExcludedByFilter(state, transaction) {
        return state.payTypeFilter[transaction.convertedPayTypeId] === false;
    },

    /**
     * Summerar kvantitet per tidskod för en anställd (endast valda transaktioner).
     */
    getEmployeeSummaryByPayType(employee) {
        const byType = {};
        for (const tx of employee.transactions) {
            if (!tx.selected) continue;
            const code = tx.convertedPayTypeId;
            if (!byType[code]) byType[code] = 0;
            byType[code] += tx.raw.quantity || 0;
        }
        return Object.entries(byType).map(([code, qty]) => ({ code, qty }));
    },

    /**
     * Returnerar alla tidsarter för en anställd med total, vald kvantitet och om alla är valda.
     */
    getEmployeePayTypeSummary(employee) {
        const byType = {};
        for (const tx of employee.transactions) {
            const code = tx.convertedPayTypeId;
            if (!byType[code]) byType[code] = { total: 0, selected: 0 };
            const q = tx.raw.quantity || 0;
            byType[code].total += q;
            if (tx.selected) byType[code].selected += q;
        }
        return Object.entries(byType).map(([code, { total, selected }]) => ({
            code,
            qty: total,
            selectedQty: selected,
            allSelected: selected >= total - 0.001
        }));
    },

    /**
     * Växlar val av alla transaktioner för en anställd med given tidskod.
     */
    togglePersonPayTypeSelection(state, employmentId, payTypeId) {
        const emp = state.employees.find(e => e.employmentId === employmentId);
        if (!emp) return;
        const txs = emp.transactions.filter(t => t.convertedPayTypeId === payTypeId);
        const anySelected = txs.some(t => t.selected);
        const newVal = !anySelected;
        for (const tx of txs) {
            tx.selected = newVal;
        }
    },

    /**
     * Räknar valda anställda och transaktioner.
     */
    getSelectionCounts(state) {
        let selectedEmployees = 0;
        let selectedTransactions = 0;
        for (const emp of state.employees) {
            if (emp.selected) {
                selectedEmployees++;
                for (const tx of emp.transactions) {
                    if (tx.selected) selectedTransactions++;
                }
            }
        }
        return { selectedEmployees, selectedTransactions };
    }
};
