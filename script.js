let expenses = JSON.parse(localStorage.getItem('expenses')) || [];

const expenseList = document.getElementById('expenseList');
const weeklyAvg = document.getElementById('weeklyAvg');
const monthlyAvg = document.getElementById('monthlyAvg');
const pieCtx = document.getElementById('pieChart').getContext('2d');
const lineCtx = document.getElementById('lineChart').getContext('2d');
const topExpensesList = document.getElementById('topExpenses');
const expenseCategory = document.getElementById('expenseCategory');
let pieChart, lineChart;

// Default categories
let categories = [
  "Credit Card","Electric Bill","Groceries","Internet Bill","Stationery","Phone Recharge",
  "Shopping","Travel","Online Food","Others","Online Shopping","Investment"
];

// Populate category dropdown
function populateCategories() {
  expenseCategory.innerHTML = '<option value="">--Select Category--</option>';
  categories.sort();
  categories.forEach(cat => {
    const option = document.createElement('option');
    option.value = cat;
    option.textContent = cat;
    expenseCategory.appendChild(option);
  });
}
populateCategories();

// Display current month & year
const now = new Date();
document.getElementById('currentMonth').textContent = now.toLocaleString('default', { month: 'long', year: 'numeric' });

function saveExpenses() {
  localStorage.setItem('expenses', JSON.stringify(expenses));
}

function capitalizeFirstLetter(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function format12h(dateStr) {
  const date = new Date(dateStr);
  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2,'0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${date.toLocaleDateString()} ${hours}:${minutes} ${ampm}`;
}

function addExpense() {
  let name = document.getElementById('expenseName').value.trim();
  const amount = parseFloat(document.getElementById('expenseAmount').value);
  let category = document.getElementById('expenseCategory').value;
  const customCategory = document.getElementById('customCategory').value.trim();
  const note = document.getElementById('expenseNote').value.trim();

  if(customCategory) {
    category = capitalizeFirstLetter(customCategory);
    if(!categories.includes(category)) categories.push(category);
    populateCategories();
  }

  if(!name || !amount) return alert("Please enter expense name and amount");
  name = capitalizeFirstLetter(name);

  const expense = { name, amount, category, note, date: new Date().toISOString() };
  expenses.push(expense);
  saveExpenses();
  renderExpenses();
  renderCharts();
  renderTopExpenses();
  calculateAverages();

  document.getElementById('expenseName').value = '';
  document.getElementById('expenseAmount').value = '';
  document.getElementById('customCategory').value = '';
  document.getElementById('expenseNote').value = '';
  expenseCategory.value = '';
}

function renderExpenses() {
  expenseList.innerHTML = '';
  expenses.forEach(e => {
    const li = document.createElement('li');
    li.innerHTML = `${e.name} - ₹${e.amount} <span>${e.category || "Uncategorized"} | ${format12h(e.date)} ${e.note ? "| " + e.note : ""}</span>`;
    expenseList.appendChild(li);
  });
}

function calculateAverages() {
  const now = new Date();
  let weekSum = 0, monthSum = 0;
  expenses.forEach(e => {
    const diff = now - new Date(e.date);
    const diffDays = diff/(1000*60*60*24);
    if(diffDays <= 7) weekSum += e.amount;
    if(diffDays <= 30) monthSum += e.amount;
  });
  weeklyAvg.textContent = weekSum.toFixed(2);
  monthlyAvg.textContent = monthSum.toFixed(2);
}

function renderCharts() {
  // Pie chart
  const categorySum = {};
  expenses.forEach(e => {
    const cat = e.category || "Uncategorized";
    categorySum[cat] = (categorySum[cat] || 0) + e.amount;
  });

  if(pieChart) pieChart.destroy();
  pieChart = new Chart(pieCtx, {
    type:'pie',
    data:{
      labels:Object.keys(categorySum),
      datasets:[{
        data:Object.values(categorySum),
        backgroundColor:['#FF6384','#36A2EB','#FFCE56','#4BC0C0','#9966FF','#FF9F40','#A9A9A9','#8FBC8F','#FFB6C1','#20B2AA','#FF7F50','#9370DB']
      }]
    }
  });

  // Line chart - daily total for past 30 days
  const dailyTotals = {};
  for(let i=0;i<30;i++){
    const day = new Date(); day.setDate(day.getDate()-i);
    const key = day.toLocaleDateString();
    dailyTotals[key]=0;
  }
  expenses.forEach(e=>{
    const key = new Date(e.date).toLocaleDateString();
    if(key in dailyTotals) dailyTotals[key]+=e.amount;
  });

  if(lineChart) lineChart.destroy();
  lineChart = new Chart(lineCtx,{
    type:'line',
    data:{
      labels:Object.keys(dailyTotals).reverse(),
      datasets:[{label:'Daily Spend', data:Object.values(dailyTotals).reverse(), fill:false, borderColor:'#36A2EB'}]
    }
  });
}

function renderTopExpenses() {
  const top5 = [...expenses].sort((a,b)=>b.amount-a.amount).slice(0,5);
  topExpensesList.innerHTML='';
  top5.forEach(e=>{
    const li=document.createElement('li');
    li.innerHTML=`${e.name} - ₹${e.amount} <span>${e.category || "Uncategorized"} | ${format12h(e.date)}</span>`;
    topExpensesList.appendChild(li);
  });
}

// Export PDF
function exportPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const margin = 40;
  let y = margin;

  // Title
  doc.setFontSize(16);
  doc.text("Personal Finance Report", margin, y);
  y += 25;

  const now = new Date();
  doc.setFontSize(12);
  doc.text("Generated: " + now.toLocaleString(), margin, y);
  y += 20;

  // Date ranges
  const weekStart = new Date();
  weekStart.setDate(now.getDate() - 6);
  const weekRange = `${weekStart.toLocaleDateString()} - ${now.toLocaleDateString()}`;

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthRange = `${monthStart.toLocaleDateString()} - ${now.toLocaleDateString()}`;

  doc.text(`Weekly Range: ${weekRange}`, margin, y);
  y += 15;
  doc.text(`Monthly Range: ${monthRange}`, margin, y);
  y += 25;

  // Table Header
  doc.setFontSize(12);
  doc.text("No", margin, y);
  doc.text("Expense Name", margin + 30, y);
  doc.text("Category", margin + 200, y);
  doc.text("Amount (₹)", margin + 350, y);
  doc.text("Date & Time", margin + 450, y);
  y += 10;
  doc.line(margin, y, 550, y); // horizontal line
  y += 10;

  // Table rows
  expenses.forEach((e, index) => {
    doc.text(String(index + 1), margin, y);
    doc.text(e.name, margin + 30, y);
    doc.text(e.category || "Uncategorized", margin + 200, y);
    doc.text(e.amount.toFixed(2), margin + 350, y);
    doc.text(format12h(e.date), margin + 450, y);
    y += 20;

    if (y > 780) { 
      doc.addPage();
      y = margin;
    }
  });

  // Footer
  y += 10;
  doc.line(margin, y, 550, y);
  y += 15;
  doc.text("End of Report", margin, y);

  doc.save("Finance_Report.pdf");
}

// Import local JSON
function importData(event) {
  const file = event.target.files[0];
  const reader = new FileReader();
  reader.onload = function(e){
    try {
      const imported = JSON.parse(e.target.result);
      if(Array.isArray(imported)) expenses = expenses.concat(imported);
      saveExpenses();
      renderExpenses();
      renderCharts();
      renderTopExpenses();
      calculateAverages();
    } catch(err){
      alert("Invalid file");
    }
  }
  reader.readAsText(file);
}

function clearAll() {
  if(confirm("Are you sure?")) {
    expenses=[];
    saveExpenses();
    renderExpenses();
    renderCharts();
    renderTopExpenses();
    calculateAverages();
  }
}

// Initial render
renderExpenses();
calculateAverages();
renderCharts();
renderTopExpenses();