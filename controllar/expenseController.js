const Expense = require("../models/Expense");


// Create Expense
exports.createExpense = async (req, res) => {
  try {
    const expense = new Expense(req.body); // req.body.employee should be employee _id
    await expense.save();
    await expense.populate("employee", "name role");

    let response = {
      success: true,
      message: "Expense created successfully",
      data: expense
    };

    // Add warning if expense > 1000
    if (expense.expense_amount > 1000) {
      response.warning = `Expense limit exceeded to 1000rs for ${expense.employee.name}`;
    }

    res.json(response);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get All Expenses
exports.getExpenses = async (req, res) => {
  try {
    const expenses = await Expense.find().populate("employee", "name role mobile");

    // Attach warnings to expenses that exceed limit
    const formattedExpenses = expenses.map((exp) => {
      const obj = exp.toObject();
      if (exp.expense_amount > 1000) {
        obj.warning = `Expense limit exceeded to 1000rs for ${exp.employee.name}`;
      }
      return obj;
    });

    res.json({ success: true, data: formattedExpenses });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};


// Update Expense
exports.updateExpense = async (req, res) => {
  try {
    const expense = await Expense.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate("employee", "name role");
    if (!expense) return res.status(404).json({ success: false, message: "Expense not found" });
    res.json({ success: true, message: "Expense updated successfully", data: expense });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Delete Expense
exports.deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findByIdAndDelete(req.params.id);
    if (!expense) return res.status(404).json({ success: false, message: "Expense not found" });
    res.json({ success: true, message: "Expense deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Approve / Reject Expense
exports.updateExpenseStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }
    const expense = await Expense.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate("employee", "name role");
    if (!expense) return res.status(404).json({ success: false, message: "Expense not found" });
    res.json({ success: true, message: "Expense status updated successfully", data: expense });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
