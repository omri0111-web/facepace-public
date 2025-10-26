interface AttendanceRecordProps {
  records: Array<{
    id: string;
    timestamp: Date;
    detectedCount: number;
    totalCapacity: number;
  }>;
}

export function AttendanceRecord({ records }: AttendanceRecordProps) {
  if (records.length === 0) {
    return (
      <div className="p-4 md:p-6 text-center text-gray-500">
        <div className="text-4xl mb-2">📊</div>
        <div className="text-sm">No attendance records yet</div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-3 max-h-80 md:max-h-64 overflow-y-auto">
      <h3 className="text-base md:text-lg font-medium mb-4">Recent Records</h3>
      <div className="space-y-2">
        {records.map((record) => (
          <div
            key={record.id}
            className="flex flex-col md:flex-row md:justify-between md:items-center p-3 bg-gray-50 rounded-xl border border-gray-100 shadow-sm"
          >
            <div className="flex-1">
              <div className="text-sm md:text-base font-medium text-gray-900">
                {record.detectedCount}/{record.totalCapacity} people
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {record.timestamp.toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit',
                  month: 'short',
                  day: 'numeric'
                })}
              </div>
            </div>
            <div className="text-xs md:text-sm text-gray-600 mt-2 md:mt-0 bg-gray-100 px-2 py-1 rounded-full w-fit">
              {Math.round((record.detectedCount / record.totalCapacity) * 100)}% capacity
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}