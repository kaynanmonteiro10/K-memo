/* ==========================================================================
   1. CONFIGURAÇÕES GLOBAIS E ESTADO
   ========================================================================== */
// Estado da Aplicação
let viewMode = 'planner'; // 'planner' ou 'diary'
let entryType = 'expense'; // 'expense', 'income', 'investment'
let selectedCategory = null;

// Controle de Tempo
let viewDate = new Date(); // Data que o usuário está OLHANDO
let selectorYear = viewDate.getFullYear(); // Ano do seletor

// Constantes
const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const tips = [
    "Pague suas contas assim que receber o salário.",
    "A regra 50-30-20 ajuda a dividir gastos essenciais, lazer e futuro.",
    "Construa uma reserva de emergência antes de investir em risco.",
    "Revise assinaturas (streaming, apps) que você não usa.",
    "Sempre negocie descontos para pagamentos à vista.",
    "Anote os pequenos gastos, como o cafézinho. Eles somam muito.",
    "Evite compras por impulso: espere 24h antes de decidir."
];

/* ==========================================================================
   2. BANCO DE DADOS (LOCALSTORAGE)
   ========================================================================== */
// Carrega dados ou inicia vazios
let planItems = JSON.parse(localStorage.getItem('kmemo_plan_final')) || [];
let transactions = JSON.parse(localStorage.getItem('kmemo_trans_final')) || [];

// Categorias Padrão
let userCats = JSON.parse(localStorage.getItem('kmemo_cats_final')) || {
    expense: ['Aluguel', 'Mercado', 'Luz/Água', 'Internet', 'Lazer', 'Transporte', 'Saúde'],
    income: ['Salário', 'Vendas', 'Freelance', 'Aposentadoria'],
    investment: ['Poupança', 'Reserva', 'Tesouro Direto', 'Ações', 'Cofrinho']
};

/* ==========================================================================
   3. INICIALIZAÇÃO
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
    // 1. Configura datas iniciais
    updateInputsDate();
    
    // 2. Renderiza a tela
    updateHeader();
    
    // 3. Verifica contas atrasadas
    checkReminders();
    
    // 4. Mostra dica do dia
    showRandomTip();
    
    // 5. Inicializa aba de Despesa no Diário
    switchEntryTab('expense');
});

/* ==========================================================================
   4. FUNÇÕES DE UTILIDADE (UI)
   ========================================================================== */
function showRandomTip() {
    const random = Math.floor(Math.random() * tips.length);
    const el = document.getElementById('financialTip');
    if(el) el.innerText = tips[random];
}

function checkReminders() {
    const today = new Date().toISOString().split('T')[0];
    // Filtra contas a pagar (bill) não feitas e com data <= hoje
    const alerts = planItems.filter(p => !p.done && p.type === 'bill' && p.date <= today);

    const bar = document.getElementById('notificationBar');
    if(alerts.length > 0) {
        bar.style.display = 'flex';
        document.getElementById('notifText').innerText = `Atenção: ${alerts.length} conta(s) vencendo ou atrasadas!`;
    } else {
        bar.style.display = 'none';
    }
}

function closeNotif() {
    document.getElementById('notificationBar').style.display = 'none';
}

function updateInputsDate() {
    // Sincroniza os inputs de data com o mês que está sendo visualizado
    const y = viewDate.getFullYear();
    const m = String(viewDate.getMonth() + 1).padStart(2, '0');
    
    // Se for o mês atual, sugere o dia de hoje. Se não, dia 01.
    const today = new Date();
    let d = '01';
    if(today.getMonth() === viewDate.getMonth() && today.getFullYear() === viewDate.getFullYear()) {
        d = String(today.getDate()).padStart(2, '0');
    }
    
    const dateStr = `${y}-${m}-${d}`;
    
    const planInput = document.getElementById('planDate');
    const diaryInput = document.getElementById('dateInput');
    
    if(planInput) planInput.value = dateStr;
    if(diaryInput) diaryInput.value = dateStr;
}

function updateHeader() {
    document.getElementById('displayMonth').innerText = monthNames[viewDate.getMonth()];
    document.getElementById('displayYear').innerText = viewDate.getFullYear();
    
    // Renderiza ambas as telas para manter sincronia
    renderPlanner();
    renderDiary();
}

/* ==========================================================================
   5. NAVEGAÇÃO E ANIMAÇÃO 3D
   ========================================================================== */
function navigateMonth(step) {
    const page = document.getElementById('mainPage');
    
    // 1. Animação de Saída (Gira para esquerda)
    page.classList.add('turn-out');

    // 2. Aguarda e troca os dados (300ms)
    setTimeout(() => {
        viewDate.setMonth(viewDate.getMonth() + step);
        updateInputsDate();
        updateHeader();
        
        // 3. Remove saída e Anima Entrada
        page.classList.remove('turn-out');
        page.classList.add('turn-in');

        // 4. Limpa classe de animação
        setTimeout(() => {
            page.classList.remove('turn-in');
        }, 600);
    }, 300);
}

function switchMainView(view) {
    viewMode = view;
    
    const divPlanner = document.getElementById('viewPlanner');
    const divDiary = document.getElementById('viewDiary');
    const btnPlanner = document.getElementById('tabPlanner');
    const btnDiary = document.getElementById('tabDiary');

    if(view === 'planner') {
        divPlanner.style.display = 'block';
        divDiary.style.display = 'none';
        btnPlanner.classList.add('active');
        btnDiary.classList.remove('active');
    } else {
        divPlanner.style.display = 'none';
        divDiary.style.display = 'block';
        btnPlanner.classList.remove('active');
        btnDiary.classList.add('active');
    }
}

/* ==========================================================================
   6. LÓGICA DO PLANEJADOR (CHECKLIST)
   ========================================================================== */
function addPlanItem() {
    const desc = document.getElementById('planDesc').value;
    const date = document.getElementById('planDate').value;
    const val = parseFloat(document.getElementById('planValue').value);
    const type = document.getElementById('planType').value;

    if(!desc || !date || isNaN(val)) {
        return alert("Preencha a descrição, data e valor corretamente.");
    }

    const newItem = {
        id: Date.now(),
        desc, date, val, type, // type: 'bill', 'income', 'save'
        done: false
    };

    planItems.push(newItem);
    savePlan();
    
    // Limpa campos
    document.getElementById('planDesc').value = "";
    document.getElementById('planValue').value = "";
    
    renderPlanner();
    checkReminders();
}

function togglePlanItem(id) {
    const item = planItems.find(p => p.id === id);
    if(!item) return;

    if(!item.done) {
        // Concluir Item
        if(confirm(`Concluir "${item.desc}"? \nDeseja lançar automaticamente no Diário?`)) {
            item.done = true;
            
            // Mapeia para transação do Diário
            let tType = 'expense';
            let tCat = 'Planejado'; // Categoria genérica ou mapeada
            
            if(item.type === 'income') {
                tType = 'income';
            } else if(item.type === 'save') {
                tType = 'investment';
                tCat = 'Meta/Economia';
            } else {
                tCat = 'Contas'; // bill
            }

            // Cria transação
            transactions.push({
                id: Date.now(),
                date: item.date,
                type: tType,
                cat: tCat,
                desc: item.desc + " (Via Planejador)",
                val: item.val
            });
            saveTrans();
            renderDiary();
        }
    } else {
        // Reabrir Item
        if(confirm("Deseja reabrir este item? (O lançamento no diário será mantido).")) {
            item.done = false;
        }
    }
    
    savePlan();
    renderPlanner();
    checkReminders();
}

function deletePlanItem(id) {
    if(confirm("Excluir este item do planejamento?")) {
        planItems = planItems.filter(p => p.id !== id);
        savePlan();
        renderPlanner();
        checkReminders();
    }
}

function renderPlanner() {
    // Filtra itens do mês visualizado
    const monthItems = planItems.filter(p => {
        const d = new Date(p.date + 'T00:00:00');
        return d.getMonth() === viewDate.getMonth() && d.getFullYear() === viewDate.getFullYear();
    });

    renderCheckList('listBills', monthItems.filter(p => p.type === 'bill'));
    renderCheckList('listIncome', monthItems.filter(p => p.type === 'income'));
    renderCheckList('listSave', monthItems.filter(p => p.type === 'save'));

    // Barra de Progresso
    const total = monthItems.length;
    const done = monthItems.filter(p => p.done).length;
    const perc = total === 0 ? 0 : Math.round((done/total)*100);
    
    document.getElementById('progressBar').style.width = perc + '%';
    document.getElementById('progressText').innerText = `${perc}%`;
}

function renderCheckList(elementId, items) {
    const el = document.getElementById(elementId);
    el.innerHTML = '';
    
    // Ordena por data
    items.sort((a,b) => new Date(a.date) - new Date(b.date));

    if(items.length === 0) {
        el.innerHTML = '<div style="color:#999; font-size:0.8rem; font-style:italic; padding:5px;">Nenhum item.</div>';
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
                    <span class="check-meta">Dia ${day} • R$ ${valFmt}</span>
                </div>
                <button onclick="deletePlanItem(${item.id})" style="border:none; background:none; color:#AAA; font-weight:bold; padding:5px;">✕</button>
            </div>
        `;
    });
}

/* ==========================================================================
   7. LÓGICA DO DIÁRIO (EXTRATO REALIZADO)
   ========================================================================== */
function switchEntryTab(type) {
    entryType = type;
    selectedCategory = null;
    
    // Atualiza botões
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
    
    // Botão Nova Categoria
    const addBtn = document.createElement('div');
    addBtn.className = 'cat-chip add-btn';
    addBtn.innerText = '+ Criar';
    addBtn.onclick = addNewCategory;
    grid.appendChild(addBtn);
}

function addNewCategory() {
    const name = prompt("Nome da nova categoria:");
    if(name && name.trim() !== "") {
        userCats[entryType].push(name.trim());
        localStorage.setItem('kmemo_cats_final', JSON.stringify(userCats));
        selectedCategory = name.trim();
        renderCategoryGrid();
    }
}

function saveEntry() {
    const dateVal = document.getElementById('dateInput').value;
    const amountVal = parseFloat(document.getElementById('amountInput').value.replace(',', '.'));
    const descVal = document.getElementById('descInput').value;

    if(!selectedCategory) return alert("Selecione uma categoria.");
    if(isNaN(amountVal) || amountVal <= 0) return alert("Valor inválido.");
    if(!dateVal) return alert("Data obrigatória.");

    transactions.push({
        id: Date.now(),
        date: dateVal,
        type: entryType,
        cat: selectedCategory,
        desc: descVal.trim() || selectedCategory,
        val: amountVal
    });
    saveTrans();
    
    // Reset Inputs
    document.getElementById('amountInput').value = '';
    document.getElementById('descInput').value = '';
    
    renderDiary();
}

function deleteTransaction(id) {
    if(confirm("Apagar este lançamento?")) {
        transactions = transactions.filter(t => t.id !== id);
        saveTrans();
        renderDiary();
    }
}

function renderDiary() {
    // Filtra dados do mês visualizado
    const monthTrans = transactions.filter(t => {
        const d = new Date(t.date + 'T00:00:00');
        return d.getMonth() === viewDate.getMonth() && d.getFullYear() === viewDate.getFullYear();
    });

    // Totais
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
    
    // Saldo = Receita - (Despesa + Investimento)
    const bal = inc - (exp + inv);
    const balEl = document.getElementById('monthBalance');
    balEl.innerText = `R$ ${fmt(bal)}`;
    balEl.className = bal >= 0 ? 'val-neutral' : 'val-red'; // Vermelho se negativo

    // Lista
    const list = document.getElementById('historyList');
    list.innerHTML = '';
    monthTrans.sort((a,b) => new Date(b.date) - new Date(a.date)); // Mais recente primeiro

    if(monthTrans.length === 0) {
        list.innerHTML = '<div style="text-align:center; padding:15px; color:#999;">Nenhum lançamento.</div>';
        return;
    }

    monthTrans.forEach(t => {
        const day = t.date.split('-')[2];
        let color = '#333';
        let sign = '-';
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
                <strong style="color:${color}; margin-right:10px;">
                    ${sign} ${t.val.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                </strong>
                <button onclick="deleteTransaction(${t.id})" style="border:none; background:none; color:#CCC; font-weight:bold;">✕</button>
            </div>
        `;
    });
}

/* ==========================================================================
   8. BACKUP E RESTAURAÇÃO (JSON)
   ========================================================================== */
function backupData() {
    const backup = {
        plan: planItems,
        trans: transactions,
        cats: userCats,
        date: new Date().toISOString()
    };
    
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
            if(data.plan && data.trans && data.cats) {
                if(confirm("Substituir dados atuais pelo backup?")) {
                    planItems = data.plan;
                    transactions = data.trans;
                    userCats = data.cats;
                    savePlan();
                    saveTrans();
                    localStorage.setItem('kmemo_cats_final', JSON.stringify(userCats));
                    
                    alert("Dados restaurados com sucesso!");
                    location.reload();
                }
            } else {
                alert("Arquivo inválido.");
            }
        } catch(err) {
            alert("Erro ao ler arquivo.");
        }
    };
    reader.readAsText(file);
}

function savePlan() { localStorage.setItem('kmemo_plan_final', JSON.stringify(planItems)); }
function saveTrans() { localStorage.setItem('kmemo_trans_final', JSON.stringify(transactions)); }

/* ==========================================================================
   9. MODAIS E RELATÓRIOS (PDF)
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
function changeSelectorYear(step) {
    selectorYear += step;
    renderMonthGrid();
}
function renderMonthGrid() {
    const grid = document.getElementById('monthGrid');
    grid.innerHTML = '';
    monthNames.forEach((n, i) => {
        const btn = document.createElement('div');
        const isSel = (i === viewDate.getMonth() && selectorYear === viewDate.getFullYear());
        btn.className = `m-btn ${isSel ? 'selected' : ''}`;
        btn.innerText = n.substring(0,3);
        btn.onclick = () => {
            viewDate.setMonth(i);
            viewDate.setFullYear(selectorYear);
            closeModals();
            updateInputsDate();
            updateHeader();
        };
        grid.appendChild(btn);
    });
}

function openReportModal() { document.getElementById('reportModal').classList.add('open'); }

function generateProfessionalPDF() {
    const type = document.getElementById('reportType').value;
    const period = document.getElementById('reportPeriod').value;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Filtro de Período
    const filterFn = (item) => {
        const d = new Date(item.date + 'T00:00:00');
        if(period === 'month') return d.getMonth() === viewDate.getMonth() && d.getFullYear() === viewDate.getFullYear();
        if(period === 'year') return d.getFullYear() === viewDate.getFullYear();
        return true;
    };

    let bodyData = [];
    let title = "";
    let headColor = [44, 62, 80];

    if(type === 'diary') {
        title = "EXTRATO REALIZADO";
        const data = transactions.filter(filterFn).sort((a,b) => new Date(a.date) - new Date(b.date));
        
        if(data.length === 0) return alert("Sem dados.");

        bodyData = data.map(t => {
            let tipo = t.type === 'income' ? 'Entrada' : (t.type === 'expense' ? 'Saída' : 'Guardado');
            return [t.date.split('-').reverse().join('/'), tipo, t.cat, t.desc, `R$ ${t.val.toFixed(2)}`];
        });

        doc.autoTable({
            head: [['Data', 'Tipo', 'Categoria', 'Descrição', 'Valor']],
            body: bodyData,
            startY: 40,
            theme: 'grid',
            headStyles: { fillColor: headColor }
        });

    } else {
        title = "STATUS PLANEJAMENTO";
        headColor = [230, 126, 34];
        const data = planItems.filter(filterFn).sort((a,b) => new Date(a.date) - new Date(b.date));
        
        if(data.length === 0) return alert("Sem dados.");

        bodyData = data.map(p => {
            let st = p.done ? 'OK' : 'PENDENTE';
            let tipo = p.type === 'bill' ? 'Conta' : (p.type === 'income' ? 'Receita' : 'Meta');
            return [p.date.split('-').reverse().join('/'), tipo, p.desc, st, `R$ ${p.val.toFixed(2)}`];
        });

        doc.autoTable({
            head: [['Data', 'Tipo', 'Descrição', 'Status', 'Valor']],
            body: bodyData,
            startY: 40,
            theme: 'grid',
            headStyles: { fillColor: headColor }
        });
    }

    // Título PDF
    doc.setFontSize(18);
    doc.text("K-memo Relatório", 14, 20);
    doc.setFontSize(10);
    doc.text(`Tipo: ${title} | Período: ${period === 'month' ? monthNames[viewDate.getMonth()] : 'Anual'} ${viewDate.getFullYear()}`, 14, 30);

    doc.save(`kmemo_${type}.pdf`);
}

function generateExcel() {
    alert("Para layout formatado, prefira o PDF. O Excel baixará dados brutos em CSV.");
    
    // Gera CSV simples dos dados atuais filtrados (mesma lógica visual)
    const type = document.getElementById('reportType').value;
    let data = [];
    if(type === 'diary') data = transactions; else data = planItems;
    
    let csv = "Data,Descricao,Valor\n";
    data.forEach(d => csv += `${d.date},${d.desc},${d.val}\n`);
    
    const blob = new Blob([csv], {type: 'text/csv'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `kmemo_${type}.csv`;
    a.click();
}