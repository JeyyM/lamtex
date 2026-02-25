// Agent Dashboard Components - Collections and Tasks

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/Button';
import { getReceivablesByBranch, getReceivablesSummary } from '@/src/mock/collections';
import { getAllTasksByAgent } from '@/src/mock/customers';
import { useAppContext } from '@/src/store/AppContext';
import {
  DollarSign,
  Clock,
  AlertTriangle,
  CheckCircle,
  Calendar,
  MessageSquare,
  Phone,
  FileText,
  TrendingUp,
  Clipboard,
  Plus,
  Eye,
  X,
} from 'lucide-react';

export function CollectionsPanel() {
  const { branch, addAuditLog } = useAppContext();
  const [showRecordPayment, setShowRecordPayment] = useState(false);
  const [selectedReceivable, setSelectedReceivable] = useState<any>(null);
  
  const receivables = getReceivablesByBranch(branch);
  const summary = getReceivablesSummary(branch);
  const overdueReceivables = receivables.filter(r => r.daysOverdue > 0).slice(0, 5);

  const handleRecordPayment = (receivable: any) => {
    setSelectedReceivable(receivable);
    setShowRecordPayment(true);
  };

  const handleRecordNote = (receivable: any) => {
    const note = prompt('Enter collection note:');
    if (note) {
      alert(`Note recorded for ${receivable.customerName}`);
      addAuditLog('Recorded Collection Note', 'Collection', `Added note for invoice ${receivable.invoiceId}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-500 mb-1">Total Outstanding</div>
                <div className="text-2xl font-bold text-gray-900">₱{(summary.totalOutstanding / 1000000).toFixed(2)}M</div>
              </div>
              <DollarSign className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-500 mb-1">Due This Week</div>
                <div className="text-2xl font-bold text-amber-600">₱{(summary.dueThisWeek / 1000).toFixed(0)}K</div>
              </div>
              <Clock className="w-8 h-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-500 mb-1">Overdue</div>
                <div className="text-2xl font-bold text-red-600">₱{(summary.overdue / 1000000).toFixed(2)}M</div>
                <div className="text-xs text-gray-500 mt-1">{summary.customersWithOverdue} customers</div>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-500 mb-1">Avg Days Overdue</div>
                <div className="text-2xl font-bold text-gray-900">{summary.avgDaysOverdue}</div>
                <div className="text-xs text-gray-500 mt-1">days</div>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Overdue Receivables List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Priority Collections - Overdue
            </span>
            <Button variant="outline" size="sm">View All</Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-gray-200">
            {overdueReceivables.map((receivable) => (
              <div key={receivable.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-gray-900">{receivable.customerName}</h4>
                      <Badge variant={receivable.status === 'Critical' ? 'danger' : 'warning'}>
                        {receivable.daysOverdue} days overdue
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      Invoice: {receivable.invoiceId} • Due: {receivable.dueDate}
                    </div>
                    {receivable.nextFollowUpDate && (
                      <div className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Follow-up: {receivable.nextFollowUpDate}
                      </div>
                    )}
                  </div>
                  <div className="text-right ml-4">
                    <div className="text-lg font-bold text-red-600">₱{receivable.balanceDue.toLocaleString()}</div>
                    <div className="flex gap-2 mt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRecordNote(receivable)}
                      >
                        <MessageSquare className="w-3 h-3 mr-1" />
                        Note
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleRecordPayment(receivable)}
                      >
                        <DollarSign className="w-3 h-3 mr-1" />
                        Record Payment
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {overdueReceivables.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
                <p className="font-medium">All collections up to date!</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Record Payment Modal */}
      {showRecordPayment && selectedReceivable && (
        <RecordPaymentModal
          receivable={selectedReceivable}
          onClose={() => {
            setShowRecordPayment(false);
            setSelectedReceivable(null);
          }}
          onSave={(data) => {
            alert('Payment recorded successfully!');
            addAuditLog('Recorded Payment', 'Collection', `Recorded payment for invoice ${selectedReceivable.invoiceId}`);
            setShowRecordPayment(false);
          }}
        />
      )}
    </div>
  );
}

export function TasksPanel() {
  const { addAuditLog } = useAppContext();
  const [showCreateTask, setShowCreateTask] = useState(false);
  const allTasks = getAllTasksByAgent();
  const todayTasks = allTasks.filter(t => t.status !== 'Completed').slice(0, 8);

  const handleCompleteTask = (task: any) => {
    if (confirm(`Mark task "${task.title}" as completed?`)) {
      alert('Task marked as completed');
      addAuditLog('Completed Task', 'Task', `Completed task: ${task.title}`);
    }
  };

  const getPriorityColor = (priority: string) => {
    if (priority === 'Urgent') return 'danger';
    if (priority === 'High') return 'warning';
    return 'default';
  };

  return (
    <div className="space-y-6">
      {/* Task Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-500 mb-1">Today's Tasks</div>
                <div className="text-2xl font-bold text-gray-900">
                  {todayTasks.filter(t => t.dueDate === '2026-02-25').length}
                </div>
              </div>
              <Calendar className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-500 mb-1">Urgent</div>
                <div className="text-2xl font-bold text-red-600">
                  {todayTasks.filter(t => t.priority === 'Urgent').length}
                </div>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-500 mb-1">In Progress</div>
                <div className="text-2xl font-bold text-amber-600">
                  {todayTasks.filter(t => t.status === 'In Progress').length}
                </div>
              </div>
              <Clipboard className="w-8 h-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Today's Work List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Clipboard className="w-5 h-5 text-red-600" />
              Today's Work
            </span>
            <Button variant="primary" size="sm" onClick={() => setShowCreateTask(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Task
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-gray-200">
            {todayTasks.map((task) => (
              <div key={task.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={getPriorityColor(task.priority)}>
                        {task.priority}
                      </Badge>
                      <Badge variant="default">{task.type}</Badge>
                      <Badge variant={task.status === 'Completed' ? 'success' : task.status === 'In Progress' ? 'warning' : 'default'}>
                        {task.status}
                      </Badge>
                    </div>
                    <h4 className="font-medium text-gray-900">{task.title}</h4>
                    <div className="text-sm text-gray-500 mt-1">{task.customerName}</div>
                    {task.description && (
                      <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {task.dueDate}
                      </span>
                      <span>{task.assignedTo}</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    {task.status !== 'Completed' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCompleteTask(task)}
                      >
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Complete
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {todayTasks.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                <Clipboard className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p>No tasks for today</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Record Payment Modal
function RecordPaymentModal({
  receivable,
  onClose,
  onSave,
}: {
  receivable: any;
  onClose: () => void;
  onSave: (data: any) => void;
}) {
  const [amount, setAmount] = useState(receivable.balanceDue.toString());
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [referenceNumber, setReferenceNumber] = useState('');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Record Payment</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <div className="text-sm font-medium text-gray-700 mb-1">Customer</div>
            <div className="text-lg font-semibold text-gray-900">{receivable.customerName}</div>
          </div>

          <div>
            <div className="text-sm font-medium text-gray-700 mb-1">Invoice</div>
            <div className="text-gray-900">{receivable.invoiceId}</div>
          </div>

          <div>
            <div className="text-sm font-medium text-gray-700 mb-1">Balance Due</div>
            <div className="text-2xl font-bold text-red-600">₱{receivable.balanceDue.toLocaleString()}</div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Amount <span className="text-red-600">*</span>
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none"
              placeholder="Enter amount"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Method <span className="text-red-600">*</span>
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none"
            >
              <option>Cash</option>
              <option>Check</option>
              <option>Bank Transfer</option>
              <option>Online Payment</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reference Number
            </label>
            <input
              type="text"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none"
              placeholder="Check #, Transfer ref, etc."
            />
          </div>
        </div>

        <div className="border-t border-gray-200 px-6 py-4 flex gap-3 justify-end">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => onSave({ amount, paymentMethod, referenceNumber })}>
            Submit for Verification
          </Button>
        </div>
      </div>
    </div>
  );
}
