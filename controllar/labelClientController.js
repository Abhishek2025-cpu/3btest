const LabelClient = require('../models/labelClient');

exports.addLabelClients = async (req, res) => {
    try {
        const { clientIds } = req.body;

        if (!clientIds || !Array.isArray(clientIds) || clientIds.length === 0) {
            return res.status(400).json({ message: "Valid clientIds array is required" });
        }

        const dataToInsert = clientIds.map(id => ({ clientId: id }));

        try {
            const result = await LabelClient.insertMany(dataToInsert, { ordered: false });
            return res.status(201).json({ 
                message: "Clients labeled successfully", 
                count: result.length 
            });
        } catch (insertError) {
            if (insertError.code === 11000 || insertError.writeErrors) {
                const insertedCount = insertError.result?.nInserted || 0;
                return res.status(201).json({ 
                    message: "Process completed with some duplicates skipped", 
                    count: insertedCount 
                });
            }
            throw insertError;
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getLabelClients = async (req, res) => {
    try {
        const clients = await LabelClient.find().populate('clientId', 'name email phone'); 
        res.status(200).json(clients);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.updateLabel = async (req, res) => {
    try {
        const updated = await LabelClient.findByIdAndUpdate(
            req.params.id, 
            req.body, 
            { new: true, runValidators: true }
        );

        if (!updated) {
            return res.status(404).json({ message: "Label not found" });
        }

        res.status(200).json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.deleteLabel = async (req, res) => {
    try {
        const deleted = await LabelClient.findByIdAndDelete(req.params.id);
        
        if (!deleted) {
            return res.status(404).json({ message: "Label not found" });
        }

        res.status(200).json({ message: "Label removed successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};