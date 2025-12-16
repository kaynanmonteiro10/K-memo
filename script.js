/* ==========================================================================
   1. CONFIGURAÇÕES GLOBAIS E ESTADO
   ========================================================================== */
let viewMode = 'planner'; 
let entryType = 'expense'; 
let selectedCategory = null;
let viewDate = new Date(); 
let selectorYear = viewDate.getFullYear();
let isPrivacyOn = false; // Estado da privacidade
let deferredPrompt; // Para o botão de instalar PWA

const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const tips = [
    "Pague suas contas assim que receber o salário.",
    "A regra 50-30-20 ajuda a dividir gastos essenciais e lazer.",
    "Construa uma reserva de emergência antes de investir.",
    "Revise assinaturas que você não usa.",
    "Sempre negocie descontos à vista.",
    "Anote os pequenos gastos, eles somam muito.",
    "Evite compras por impulso: espere 24h."
];

/* ==========================================================================
   2. BANCO DE DADOS (LOCALSTORAGE)
   ========================================================================== */
let planItems = JSON.parse(localStorage.getItem('kmemo_plan_ultimate')) || [];
let transactions = JSON.parse(localStorage.getItem('kmemo_trans_ultimate')) || [];
let userCats = JSON.parse(localStorage.getItem('kmemo_cats_ultimate')) || {
    expense: ['Aluguel', 'Mercado', 'Luz/Água', 'Internet', 'Lazer', 'Transporte', 'Saúde'],
    income: ['Salário', 'Vendas', 'Freelance', 'Aposentadoria'],
    investment: ['Poupança', 'Reserva', 'Tesouro Direto', 'Ações', 'Cofrinho']
};

/* ==========================================================================
   3. INICIALIZAÇÃO E PWA
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
    updateInputsDate();
    updateHeader();
    checkReminders();
    showRandomTip();
    switchEntryTab('expense');

    // Pedir permissão de notificação no primeiro clique
    if ("Notification" in window && Notification.permission !== "granted") {
        document.body.addEventListener('click', () => Notification.requestPermission(), { once: true });
    }
});

// Captura o evento de "Pode Instalar" do navegador
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    // Mostra o botão de instalar dentro do modal
    const installContainer = document.getElementById('installContainer');
    if (installContainer) installContainer.style.display = 'block';
    
    document.getElementById('btnInstallApp').addEventListener('click', async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                installContainer.style.display = 'none';
            }
            deferredPrompt = null;
        }
    });
});

/* ==========================================================================
   4. FUNÇÕES DE UI (NOTIFICAÇÕES, DICAS, PRIVACIDADE)
   ========================================================================== */
function showRandomTip() {
    const random = Math.floor(Math.random() * tips.length);
    const el = document.getElementById('financialTip');
    if(el) el.innerText = tips[random];
}

function checkReminders() {
    const today = new Date().toISOString().split('T')[0];
    const alerts = planItems.filter(p => !p.done && p.type === 'bill' && p.date <= today);
    const bar = document.getElementById('notificationBar');

    if(alerts.length > 0) {
        bar.style.display = 'flex';
        document.getElementById('notifText').innerText = `Atenção: ${alerts.length} conta(s) vencendo ou atrasadas!`;
        
        // Notificação do Sistema
        if ("Notification" in window && Notification.permission === "granted") {
            new Notification("K-memo Alerta", {
                body: `Você tem ${alerts.length} contas pendentes hoje.`,
                icon: 'icon.png'
            });
        }
    } else {
        bar.style.display = 'none';
    }
}
function closeNotif() { document.getElementById('notificationBar').style.display = 'none'; }

// --- MODO PRIVACIDADE ---
function togglePrivacy() {
    isPrivacyOn = !isPrivacyOn;
    const btn = document.getElementById('btnPrivacy');
    btn.innerText = isPrivacyOn ? '🙈' : '👁️';
    applyPrivacy();
}

function applyPrivacy() {
    // IDs fixos (Resumo do Diário)
    const fixedIds = ['monthIncome', 'monthExpense', 'monthInvest', 'monthBalance'];
    fixedIds.forEach(id => {
        const el = document.getElementById(id);
        if(el) isPrivacyOn ? el.classList.add('blur-value') : el.classList.remove('blur-value');
    });

    // Elementos dinâmicos (Listas)
    const dynamicEls = document.querySelectorAll('.check-val, .hist-item strong');
    dynamicEls.forEach(el => {
        isPrivacyOn ? el.classList.add('blur-value') : el.classList.remove('blur-value');
    });
}

/* ==========================================================================
   5. NAVEGAÇÃO E DATAS
   ========================================================================== */
function updateInputsDate() {
    const y = viewDate.getFullYear();
    const m = String(viewDate.getMonth() + 1).padStart(2, '0');
    const today = new Date();
    let d = '01';
    
    if(today.getMonth() === viewDate.getMonth() && today.getFullYear() === viewDate.getFullYear()) {
        d = String(today.getDate()).padStart(2, '0');
    }
    const dateStr = `${y}-${m}-${d}`;
    
    if(document.getElementById('planDate')) document.getElementById('planDate').value = dateStr;
    if(document.getElementById('dateInput')) document.getElementById('dateInput').value = dateStr;
}

function updateHeader() {
    document.getElementById('displayMonth').innerText = monthNames[viewDate.getMonth()];
    document.getElementById('displayYear').innerText = viewDate.getFullYear();
    renderPlanner();
    renderDiary();
}

function navigateMonth(step) {
    const page = document.getElementById('mainPage');
    page.classList.add('turn-out');
    
    setTimeout(() => {
        viewDate.setMonth(viewDate.getMonth() + step);
        updateInputsDate();
        updateHeader();
        page.classList.remove('turn-out');
        page.classList.add('turn-in');
        setTimeout(() => page.classList.remove('turn-in'), 600);
    }, 300);
}

function switchMainView(view) {
    viewMode = view;
    document.getElementById('viewPlanner').style.display = view === 'planner' ? 'block' : 'none';
    document.getElementById('viewDiary').style.display = view === 'diary' ? 'block' : 'none';
    document.getElementById('tabPlanner').classList.toggle('active', view === 'planner');
    document.getElementById('tabDiary').classList.toggle('active', view === 'diary');
}

/* ==========================================================================
   6. PLANEJADOR (CHECKLIST)
   ========================================================================== */
function addPlanItem() {
    const desc = document.getElementById('planDesc').value;
    const date = document.getElementById('planDate').value;
    const val = parseFloat(document.getElementById('planValue').value);
    const type = document.getElementById('planType').value;

    if(!desc || !date || isNaN(val)) return alert("Preencha todos os campos.");

    planItems.push({ id: Date.now(), desc, date, val, type, done: false });
    savePlan();
    
    document.getElementById('planDesc').value = "";
    document.getElementById('planValue').value = "";
    renderPlanner();
    checkReminders();
}

function togglePlanItem(id) {
    const item = planItems.find(p => p.id === id);
    if(!item) return;

    if(!item.done) {
        if(confirm(`Concluir "${item.desc}" e lançar no Diário?`)) {
            item.done = true;
            let tType = 'expense', tCat = 'Planejado';
            if(item.type === 'income') tType = 'income';
            else if(item.type === 'save') { tType = 'investment'; tCat = 'Meta'; }
            else tCat = 'Contas';

            transactions.push({ id: Date.now(), date: item.date, type: tType, cat: tCat, desc: item.desc + " (Via Planejador)", val: item.val });
            saveTrans();
            renderDiary();
        }
    } else {
        if(confirm("Reabrir este item?")) item.done = false;
    }
    savePlan();
    renderPlanner();
    checkReminders();
}

function deletePlanItem(id) {
    if(confirm("Excluir item planejado?")) {
        planItems = planItems.filter(p => p.id !== id);
        savePlan();
        renderPlanner();
        checkReminders();
    }
}

function renderPlanner() {
    const monthItems = planItems.filter(p => {
        const d = new Date(p.date + 'T00:00:00');
        return d.getMonth() === viewDate.getMonth() && d.getFullYear() === viewDate.getFullYear();
    });

    renderCheckList('listBills', monthItems.filter(p => p.type === 'bill'));
    renderCheckList('listIncome', monthItems.filter(p => p.type === 'income'));
    renderCheckList('listSave', monthItems.filter(p => p.type === 'save'));

    const total = monthItems.length;
    const done = monthItems.filter(p => p.done).length;
    const perc = total === 0 ? 0 : Math.round((done/total)*100);
    document.getElementById('progressBar').style.width = perc + '%';
    document.getElementById('progressText').innerText = `${perc}%`;
    
    applyPrivacy(); // Reaplica o blur se necessário
}

function renderCheckList(elemId, items) {
    const el = document.getElementById(elemId);
    el.innerHTML = '';
    items.sort((a,b) => new Date(a.date) - new Date(b.date));

    if(items.length === 0) {
        el.innerHTML = '<div style="color:#999;font-size:0.8rem;padding:5px;">Nenhum item.</div>';
        return;
    }

    items.forEach(item => {
        const day = item.date.split('-')[2];
        const valFmt = item.val.toLocaleString('pt-BR', {minimumFractionDigits: 2});
        const doneClass = item.done ? 'done' : '';
        const checkClass = item.done ? 'checked' : '';

        el.innerHTML += `
            <div class="checklist-item ${doneClass}">
                <div class="check-box-custom ${checkClass}" onclick="togglePlanItem(${item.id})">✔</div>
                <div class="check-info">
                    <span class="check-name">${item.desc}</span>
                    <span class="check-meta">Dia ${day}</span>
                </div>
                <div class="check-val">R$ ${valFmt}</div>
                <button onclick="deletePlanItem(${item.id})" style="border:none;background:none;color:#AAA;font-weight:bold;margin-left:10px;cursor:pointer;">✕</button>
            </div>`;
    });
}

/* ==========================================================================
   7. DIÁRIO (LANÇAMENTOS)
   ========================================================================== */
function switchEntryTab(type) {
    entryType = type;
    selectedCategory = null;
    document.getElementById('btnTabExpense').className = type === 'expense' ? 'tab-btn active' : 'tab-btn';
    document.getElementById('btnTabIncome').className = type === 'income' ? 'tab-btn active' : 'tab-btn';
    document.getElementById('btnTabInvest').className = type === 'investment' ? 'tab-btn active' : 'tab-btn';
    renderCategoryGrid();
}

function renderCategoryGrid() {
    const grid = document.getElementById('categoryGrid');
    grid.innerHTML = '';
    userCats[entryType].forEach(cat => {
        const btn = document.createElement('div');
        btn.className = `cat-chip ${selectedCategory === cat ? 'selected' : ''}`;
        btn.innerText = cat;
        btn.onclick = () => { selectedCategory = cat; renderCategoryGrid(); };
        grid.appendChild(btn);
    });
    
    const addBtn = document.createElement('div');
    addBtn.className = 'cat-chip add-btn';
    addBtn.innerText = '+ Criar';
    addBtn.onclick = () => {
        const name = prompt("Nome da categoria:");
        if(name) {
            userCats[entryType].push(name);
            localStorage.setItem('kmemo_cats_ultimate', JSON.stringify(userCats));
            selectedCategory = name;
            renderCategoryGrid();
        }
    };
    grid.appendChild(addBtn);
}

function saveEntry() {
    const dateVal = document.getElementById('dateInput').value;
    const amountVal = parseFloat(document.getElementById('amountInput').value.replace(',', '.'));
    const descVal = document.getElementById('descInput').value;

    if(!selectedCategory) return alert("Selecione uma categoria.");
    if(isNaN(amountVal) || amountVal <= 0) return alert("Valor inválido.");
    if(!dateVal) return alert("Data obrigatória.");

    transactions.push({
        id: Date.now(), date: dateVal, type: entryType, cat: selectedCategory, desc: descVal.trim() || selectedCategory, val: amountVal
    });
    saveTrans();
    
    document.getElementById('amountInput').value = '';
    document.getElementById('descInput').value = '';
    renderDiary();
}

function deleteTransaction(id) {
    if(confirm("Excluir este lançamento permanentemente?")) {
        transactions = transactions.filter(t => t.id !== id);
        saveTrans();
        renderDiary();
    }
}

function renderDiary() {
    const monthTrans = transactions.filter(t => {
        const d = new Date(t.date + 'T00:00:00');
        return d.getMonth() === viewDate.getMonth() && d.getFullYear() === viewDate.getFullYear();
    });

    let inc = 0, exp = 0, inv = 0;
    monthTrans.forEach(t => {
        if(t.type === 'income') inc += t.val;
        else if(t.type === 'investment') inv += t.val;
        else exp += t.val;
    });

    const fmt = v => v.toLocaleString('pt-BR', {minimumFractionDigits: 2});
    document.getElementById('monthIncome').innerText = fmt(inc);
    document.getElementById('monthExpense').innerText = fmt(exp);
    document.getElementById('monthInvest').innerText = fmt(inv);
    
    const bal = inc - (exp + inv);
    const balEl = document.getElementById('monthBalance');
    balEl.innerText = `R$ ${fmt(bal)}`;
    balEl.className = bal >= 0 ? 'val-neutral' : 'val-red';

    const list = document.getElementById('historyList');
    list.innerHTML = '';
    monthTrans.sort((a,b) => new Date(b.date) - new Date(a.date));

    if(monthTrans.length === 0) {
        list.innerHTML = '<div style="text-align:center;padding:20px;color:#999;">Sem lançamentos.</div>';
    } else {
        monthTrans.forEach(t => {
            const day = t.date.split('-')[2];
            let color = '#333', sign = '-';
            if(t.type === 'income') { color = 'var(--color-income)'; sign = '+'; }
            if(t.type === 'expense') { color = 'var(--color-expense)'; sign = '-'; }
            if(t.type === 'investment') { color = 'var(--color-invest)'; sign = ''; }

            list.innerHTML += `
                <div class="hist-item">
                    <span class="hist-date">${day}</span>
                    <div class="hist-info">
                        <span class="hist-cat">${t.cat}</span>
                        <span class="hist-desc">${t.desc}</span>
                    </div>
                    <strong style="color:${color};margin-right:10px;">${sign} ${t.val.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</strong>
                    <button onclick="deleteTransaction(${t.id})" class="btn-delete">✕</button>
                </div>`;
        });
    }
    applyPrivacy();
}

/* ==========================================================================
   8. BACKUP, RESTORE E RELATÓRIOS
   ========================================================================== */
function backupData() {
    const backup = { plan: planItems, trans: transactions, cats: userCats, date: new Date() };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backup));
    const a = document.createElement('a');
    a.setAttribute("href", dataStr);
    a.setAttribute("download", `kmemo_backup_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(a);
    a.click();
    a.remove();
}

function restoreData(input) {
    const file = input.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if(data.plan && data.trans) {
                if(confirm("Substituir dados atuais pelo backup?")) {
                    planItems = data.plan;
                    transactions = data.trans;
                    userCats = data.cats || userCats;
                    savePlan(); saveTrans();
                    localStorage.setItem('kmemo_cats_ultimate', JSON.stringify(userCats));
                    alert("Restaurado com sucesso!");
                    location.reload();
                }
            } else alert("Arquivo inválido.");
        } catch(err) { alert("Erro ao ler arquivo."); }
    };
    reader.readAsText(file);
}

function generateProfessionalPDF() {
    const type = document.getElementById('reportType').value;
    const period = document.getElementById('reportPeriod').value;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const filterFn = (item) => {
        const d = new Date(item.date + 'T00:00:00');
        if(period === 'month') return d.getMonth() === viewDate.getMonth() && d.getFullYear() === viewDate.getFullYear();
        return d.getFullYear() === viewDate.getFullYear();
    };

    let body = [], title = "", headColor = [44, 62, 80];

    if(type === 'diary') {
        title = "EXTRATO REALIZADO";
        const data = transactions.filter(filterFn).sort((a,b) => new Date(a.date) - new Date(b.date));
        if(!data.length) return alert("Sem dados.");
        body = data.map(t => [t.date.split('-').reverse().join('/'), t.type.toUpperCase(), t.cat, t.desc, `R$ ${t.val.toFixed(2)}`]);
        
        doc.autoTable({ head: [['Data', 'Tipo', 'Categoria', 'Descrição', 'Valor']], body: body, startY: 40, theme: 'grid', headStyles: {fillColor: headColor} });
    } else {
        title = "STATUS PLANEJAMENTO";
        headColor = [230, 126, 34];
        const data = planItems.filter(filterFn).sort((a,b) => new Date(a.date) - new Date(b.date));
        if(!data.length) return alert("Sem dados.");
        body = data.map(p => [p.date.split('-').reverse().join('/'), p.type.toUpperCase(), p.desc, p.done?'OK':'PENDENTE', `R$ ${p.val.toFixed(2)}`]);
        
        doc.autoTable({ head: [['Data', 'Tipo', 'Descrição', 'Status', 'Valor']], body: body, startY: 40, theme: 'grid', headStyles: {fillColor: headColor} });
    }

    doc.setFontSize(18);
    doc.text("K-memo Relatório", 14, 20);
    doc.setFontSize(10);
    doc.text(`${title} - ${period==='month' ? monthNames[viewDate.getMonth()] : 'Anual'} ${viewDate.getFullYear()}`, 14, 30);
    doc.save(`kmemo_${type}.pdf`);
}

function generateExcel() {
    const type = document.getElementById('reportType').value;
    const data = (type === 'diary' ? transactions : planItems);
    let csv = "Data,Descricao,Valor\n";
    data.forEach(d => csv += `${d.date},${d.desc},${d.val}\n`);
    const blob = new Blob([csv], {type: 'text/csv'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `kmemo_${type}.csv`;
    a.click();
}

function savePlan() { localStorage.setItem('kmemo_plan_ultimate', JSON.stringify(planItems)); }
function saveTrans() { localStorage.setItem('kmemo_trans_ultimate', JSON.stringify(transactions)); }

/* ==========================================================================
   9. MODAIS
   ========================================================================== */
function openMonthSelector() {
    selectorYear = viewDate.getFullYear();
    renderMonthGrid();
    document.getElementById('monthModal').classList.add('open');
}
function closeModals() {
    document.getElementById('monthModal').classList.remove('open');
    document.getElementById('reportModal').classList.remove('open');
}
function changeSelectorYear(step) { selectorYear += step; renderMonthGrid(); }
function renderMonthGrid() {
    const grid = document.getElementById('monthGrid');
    grid.innerHTML = '';
    monthNames.forEach((n, i) => {
        const btn = document.createElement('div');
        btn.className = `m-btn ${i === viewDate.getMonth() && selectorYear === viewDate.getFullYear() ? 'selected' : ''}`;
        btn.innerText = n.substring(0,3);
        btn.onclick = () => { viewDate.setMonth(i); viewDate.setFullYear(selectorYear); closeModals(); updateInputsDate(); updateHeader(); };
        grid.appendChild(btn);
    });
}
function openReportModal() { document.getElementById('reportModal').classList.add('open'); }
