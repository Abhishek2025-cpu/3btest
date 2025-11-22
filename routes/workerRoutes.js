const express = require('express');
const router = express.Router();
const workerController = require('../controllar/workerController');

// CRUD routes
router.post('/add-task', workerController.createWorker);
router.get('/get-task', workerController.getAllWorkers);
router.get('/employee-task/:id', workerController.getWorkersByEmployeeId);
router.get('/:id', workerController.getWorkerById);
router.put('/update-task/:id', workerController.updateWorker);
router.put('/updateWorker/:id', workerController.updateWorker);

router.delete('/delete=task/:id', workerController.deleteWorker);

module.exports = router;
