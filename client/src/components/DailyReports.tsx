
import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/utils/trpc';
import type { DailyReport } from '../../../server/src/schema';
import { 
  BarChart3, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  AlertTriangle,
  Receipt
} from 'lucide-react';

export function DailyReports() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [report, setReport] = useState<DailyReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateReport = useCallback(async () => {
    if (!selectedDate) return;

    setIsLoading(true);
    setError(null);
    
    try {
      const result = await trpc.getDailyReport.query({ date: selectedDate });
      setReport(result);
    } catch (err) {
      console.error('Failed to generate report:', err);
      setError('Failed to generate daily report. Please try again.');
      setReport(null);
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate]);

  const getProfitColor = (profit: number) => {
    if (profit > 0) return 'text-green-600';
    if (profit < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getProfitTrend = (profit: number) => {
    if (profit > 0) return { icon: TrendingUp, color: 'text-green-600' };
    if (profit < 0) return { icon: TrendingDown, color: 'text-red-600' };
    return { icon: BarChart3, color: 'text-gray-600' };
  };

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Report Generator */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="w-5 h-5" />
            <span>Daily Sales Report</span>
          </CardTitle>
          <CardDescription>
            Generate comprehensive daily sales and profit reports
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end space-x-4">
            <div className="flex-1 space-y-2">
              <Label htmlFor="report-date">Select Date</Label>
              <Input
                id="report-date"
                type="date"
                value={selectedDate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSelectedDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
            <Button
              onClick={generateReport}
              disabled={isLoading || !selectedDate}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? 'Generating...' : 'Generate Report'}
            </Button>
          </div>

          {/* Quick Date Buttons */}
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                setSelectedDate(yesterday.toISOString().split('T')[0]);
              }}
            >
              Yesterday
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                setSelectedDate(weekAgo.toISOString().split('T')[0]);
              }}
            >
              Last Week
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Report Display */}
      {report && (
        <div className="space-y-6">
          {/* Report Header */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Daily Report - {new Date(report.date).toLocaleDateString()}</span>
                <Badge variant="secondary" className="flex items-center space-x-1">
                  <Receipt className="w-3 h-3" />
                  <span>{report.transaction_count} transactions</span>
                </Badge>
              </CardTitle>
            </CardHeader>
          </Card>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${report.total_sales.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Revenue from all transactions
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  ${report.total_cost.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Cost of goods sold
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Gross Profit</CardTitle>
                {(() => {
                  const trend = getProfitTrend(report.gross_profit);
                  const TrendIcon = trend.icon;
                  return <TrendIcon className={`h-4 w-4 ${trend.color}`} />;
                })()}
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${getProfitColor(report.gross_profit)}`}>
                  ${report.gross_profit.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {report.total_sales > 0 
                    ? `${((report.gross_profit / report.total_sales) * 100).toFixed(1)}% margin`
                    : 'No sales recorded'
                  }
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Transactions</CardTitle>
                <Receipt className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {report.transaction_count}
                </div>
                <p className="text-xs text-muted-foreground">
                  {report.transaction_count > 0 
                    ? `$${(report.total_sales / report.transaction_count).toFixed(2)} avg per sale`
                    : 'No transactions'
                  }
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Analysis */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Analysis</CardTitle>
              <CardDescription>
                Detailed breakdown of your daily business performance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-semibold text-lg">📊 Sales Metrics</h4>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                      <span className="font-medium">Total Revenue</span>
                      <span className="text-lg font-bold text-blue-600">
                        ${report.total_sales.toFixed(2)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="font-medium">Average Transaction</span>
                      <span className="text-lg font-bold">
                        ${report.transaction_count > 0 
                          ? (report.total_sales / report.transaction_count).toFixed(2)
                          : '0.00'
                        }
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                      <span className="font-medium">Transaction Count</span>
                      <span className="text-lg font-bold text-green-600">
                        {report.transaction_count}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold text-lg">💰 Profit Analysis</h4>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                      <span className="font-medium">Cost of Goods</span>
                      <span className="text-lg font-bold text-red-600">
                        ${report.total_cost.toFixed(2)}
                      </span>
                    </div>
                    
                    <div className={`flex justify-between items-center p-3 rounded-lg ${
                      report.gross_profit >= 0 ? 'bg-green-50' : 'bg-red-50'
                    }`}>
                      <span className="font-medium">Gross Profit</span>
                      <span className={`text-lg font-bold ${getProfitColor(report.gross_profit)}`}>
                        ${report.gross_profit.toFixed(2)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="font-medium">Profit Margin</span>
                      <span className={`text-lg font-bold ${getProfitColor(report.gross_profit)}`}>
                        {report.total_sales > 0 
                          ? `${((report.gross_profit / report.total_sales) * 100).toFixed(1)}%`
                          : '0.0%'
                        }
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Performance Insights */}
              <div className="space-y-3">
                <h4 className="font-semibold text-lg">🎯 Performance Insights</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {report.transaction_count === 0 && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        No transactions recorded for this date. This could indicate a slow business day or potential system issues.
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {report.gross_profit < 0 && (
                    <Alert variant="destructive">
                      <TrendingDown className="h-4 w-4" />
                      <AlertDescription>
                        Negative profit margin detected. Review pricing strategy and cost management.
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {report.gross_profit > 0 && report.total_sales > 0 && (
                    <Alert className="border-green-200 bg-green-50">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-800">
                        Profitable day! Keep up the good work with your current strategy.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Stub Notice */}
      {!report && !isLoading && (
        <Card>
          <CardContent className="pt-6">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                📊 Daily reports are currently using stub data. Select a date and generate a report to see the interface layout.
                In a production environment, this would connect to your sales database for real transaction data.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
