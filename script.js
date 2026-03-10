const form = document.getElementById("transactionForm");
const totalIncome = document.getElementById("totalIncome");
const totalExpense = document.getElementById("totalExpenses");
const totalBalance = document.getElementById("totalBalance");
const list = document.getElementById("recentTransactionList");

let income = 0;
let expense = 0;

form.addEventListener("submit", function(e){
e.preventDefault();

const description = document.getElementById("description").value;
const amount = Number(document.getElementById("amount").value);
const type = document.getElementById("type").value;

if(type === "income"){
    income += amount;
}else{
    expense += amount;
}

const balance = income - expense;

totalIncome.textContent = "₹" + income.toFixed(2);
totalExpense.textContent = "₹" + expense.toFixed(2);
totalBalance.textContent = "₹" + balance.toFixed(2);

addTransaction(description, amount, type);

form.reset();
});