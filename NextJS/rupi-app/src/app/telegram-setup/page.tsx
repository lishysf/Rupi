'use client';

import { useState } from 'react';
import { CheckCircle, XCircle, Loader2, ExternalLink } from 'lucide-react';

interface SetupStep {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'success' | 'error';
  message?: string;
}

export default function TelegramSetupPage() {
  const [steps, setSteps] = useState<SetupStep[]>([
    { id: 'init_db', name: 'Initialize Database Tables', status: 'pending' },
    { id: 'set_webhook', name: 'Configure Telegram Webhook', status: 'pending' },
    { id: 'verify', name: 'Verify Setup', status: 'pending' }
  ]);
  
  const [isRunning, setIsRunning] = useState(false);
  const [webhookInfo, setWebhookInfo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const updateStep = (stepId: string, status: SetupStep['status'], message?: string) => {
    setSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, status, message } : step
    ));
  };

  const runSetup = async () => {
    setIsRunning(true);
    setError(null);
    setWebhookInfo(null);

    try {
      // Step 1: Initialize database
      updateStep('init_db', 'running');
      const initResponse = await fetch('/api/telegram/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'init_database' })
      });
      
      const initData = await initResponse.json();
      if (initData.success) {
        updateStep('init_db', 'success', 'Database tables created successfully');
      } else {
        updateStep('init_db', 'error', initData.error || 'Failed to initialize database');
        throw new Error(initData.error || 'Database initialization failed');
      }

      // Step 2: Set webhook with correct URL (using www.fundy.id)
      updateStep('set_webhook', 'running');
      const webhookUrl = 'https://www.fundy.id/api/telegram/webhook';
      const webhookResponse = await fetch('/api/telegram/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'set_webhook', 
          webhookUrl 
        })
      });
      
      const webhookData = await webhookResponse.json();
      if (webhookData.success) {
        updateStep('set_webhook', 'success', 'Webhook configured successfully');
      } else {
        updateStep('set_webhook', 'error', webhookData.error || 'Failed to set webhook');
        throw new Error(webhookData.error || 'Webhook setup failed');
      }

      // Step 3: Verify setup
      updateStep('verify', 'running');
      const verifyResponse = await fetch('/api/telegram/setup');
      const verifyData = await verifyResponse.json();
      
      if (verifyData.success) {
        setWebhookInfo(verifyData.webhookInfo);
        updateStep('verify', 'success', 'Setup verified successfully');
      } else {
        updateStep('verify', 'error', 'Failed to verify setup');
        throw new Error('Verification failed');
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Setup failed');
      console.error('Setup error:', err);
    } finally {
      setIsRunning(false);
    }
  };

  const getStepIcon = (status: SetupStep['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'running':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      default:
        return <div className="w-5 h-5 border-2 border-gray-300 rounded-full" />;
    }
  };

  const getStepColor = (status: SetupStep['status']) => {
    switch (status) {
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      case 'running':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow-xl rounded-lg">
          <div className="px-6 py-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                🤖 Telegram Bot Setup
              </h1>
              <p className="text-gray-600">
                Configure your Fundy Telegram bot integration
              </p>
            </div>

            {/* Current Status */}
            {webhookInfo && (
              <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                <h3 className="text-sm font-medium text-yellow-800 mb-2">
                  🔍 Current Webhook Status
                </h3>
                <div className="text-sm text-yellow-700 space-y-1">
                  <p><strong>URL:</strong> {webhookInfo.url || 'Not set'}</p>
                  <p><strong>Pending Updates:</strong> {webhookInfo.pending_update_count || 0}</p>
                  {webhookInfo.last_error_message && (
                    <div className="mt-2 p-2 bg-red-100 border border-red-200 rounded">
                      <p className="text-red-800"><strong>Last Error:</strong> {webhookInfo.last_error_message}</p>
                      {webhookInfo.last_error_message.includes('307') && (
                        <p className="text-red-700 mt-1">
                          <strong>Fix:</strong> The webhook URL needs to use www.fundy.id instead of fundy.id
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Setup Steps */}
            <div className="space-y-6 mb-8">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    {getStepIcon(step.status)}
                  </div>
                  <div className="flex-1">
                    <h3 className={`font-medium ${getStepColor(step.status)}`}>
                      {step.name}
                    </h3>
                    {step.message && (
                      <p className="text-sm text-gray-500 mt-1">
                        {step.message}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
                <div className="flex">
                  <XCircle className="w-5 h-5 text-red-400 mt-0.5" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">
                      Setup Error
                    </h3>
                    <p className="text-sm text-red-700 mt-1">
                      {error}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Success Display */}
            {webhookInfo && !error && steps.every(s => s.status === 'success') && (
              <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-6">
                <h3 className="text-sm font-medium text-green-800 mb-2">
                  ✅ Setup Complete!
                </h3>
                <div className="text-sm text-green-700 space-y-1">
                  <p><strong>Webhook URL:</strong> {webhookInfo.url || 'Not set'}</p>
                  <p><strong>Pending Updates:</strong> {webhookInfo.pending_update_count || 0}</p>
                  <p><strong>Max Connections:</strong> {webhookInfo.max_connections || 40}</p>
                  {webhookInfo.last_error_message && (
                    <p className="text-red-600">
                      <strong>Last Error:</strong> {webhookInfo.last_error_message}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={runSetup}
                disabled={isRunning}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 px-6 rounded-lg transition-colors flex items-center justify-center"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Setting up...
                  </>
                ) : (
                  'Run Setup (Fix Webhook URL)'
                )}
              </button>
              
              <button
                onClick={() => window.location.reload()}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
              >
                Reset
              </button>
            </div>

            {/* Instructions */}
            <div className="mt-8 bg-blue-50 border border-blue-200 rounded-md p-4">
              <h3 className="text-sm font-medium text-blue-800 mb-2">
                📋 Next Steps
              </h3>
              <div className="text-sm text-blue-700 space-y-2">
                <p>1. Make sure <code className="bg-blue-100 px-1 rounded">TELEGRAM_BOT_TOKEN</code> is set in Vercel environment variables</p>
                <p>2. Click "Run Setup" above to fix the webhook URL (will use www.fundy.id)</p>
                <p>3. Open Telegram and search for <strong>@FundyIDbot</strong></p>
                <p>4. Send <code className="bg-blue-100 px-1 rounded">/start</code> to begin</p>
              </div>
            </div>

            {/* Quick Links */}
            <div className="mt-6 flex flex-wrap gap-4">
              <a
                href="https://t.me/FundyIDbot"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open Bot in Telegram
              </a>
              
              <a
                href="https://t.me/BotFather"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                BotFather
              </a>
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-8 bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            🔧 Troubleshooting
          </h2>
          <div className="space-y-3 text-sm text-gray-600">
            <p><strong>307 Redirect Error?</strong> The webhook URL needs to use www.fundy.id. Click "Run Setup" to fix this.</p>
            <p><strong>Bot not responding?</strong> Check that TELEGRAM_BOT_TOKEN is set in Vercel environment variables.</p>
            <p><strong>Setup fails?</strong> Make sure your app is deployed and accessible.</p>
            <p><strong>Can't login?</strong> Use your Fundy web account credentials.</p>
            <p><strong>Need help?</strong> Check Vercel logs for detailed error messages.</p>
          </div>
        </div>
      </div>
    </div>
  );
}