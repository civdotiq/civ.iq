/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { RepresentativeTradingCard } from './RepresentativeTradingCard';
import { TradingCardSharePanel } from './TradingCardSharePanel';
import { EnhancedRepresentative } from '@/types/representative';
import { 
  generateCardImage, 
  downloadCardImage, 
  generateCardFilename, 
  checkBrowserSupport, 
  optimizeElementForGeneration,
  CardGenerationResult 
} from '@/lib/cardGenerator';

interface CardStat {
  label: string;
  value: string | number;
  icon: string;
  color: string;
  description: string;
}

interface TradingCardGeneratorProps {
  representative: EnhancedRepresentative;
  stats: CardStat[];
  isOpen: boolean;
  onClose: () => void;
  onGenerated?: (result: CardGenerationResult) => void;
  customization?: any; // Will be properly typed when needed
}

export function TradingCardGenerator({ 
  representative, 
  stats, 
  isOpen, 
  onClose, 
  onGenerated,
  customization
}: TradingCardGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState<string>('');
  const [generationResult, setGenerationResult] = useState<CardGenerationResult | null>(null);
  const [browserSupport, setBrowserSupport] = useState<ReturnType<typeof checkBrowserSupport> | null>(null);
  const [showSharePanel, setShowSharePanel] = useState(false);
  
  const cardRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Check browser support on mount
  useEffect(() => {
    setBrowserSupport(checkBrowserSupport());
  }, []);

  const generateCard = async () => {
    if (!cardRef.current || !browserSupport?.supported) return;

    setIsGenerating(true);
    setGenerationStep('Preparing card for generation...');

    try {
      // Optimize the card element for generation
      optimizeElementForGeneration(cardRef.current);
      
      // Wait for fonts and images to load
      setGenerationStep('Loading fonts and images...');
      await new Promise(resolve => setTimeout(resolve, 500));

      // Generate the image
      setGenerationStep('Generating high-quality image...');
      const result = await generateCardImage(cardRef.current, {
        width: 320,
        height: 500,
        scale: 2, // High-DPI
        backgroundColor: '#ffffff',
        format: 'png',
        quality: 0.95
      });

      if (result.success) {
        setGenerationStep('Image generated successfully!');
        setGenerationResult(result);
        
        // Show the generated canvas
        if (canvasRef.current && result.canvas) {
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) {
            canvasRef.current.width = result.canvas.width;
            canvasRef.current.height = result.canvas.height;
            ctx.drawImage(result.canvas, 0, 0);
          }
        }

        // Call the callback if provided
        if (onGenerated) {
          onGenerated(result);
        }

      } else {
        setGenerationStep(`Error: ${result.error}`);
        setGenerationResult(result);
      }

    } catch (error) {
      console.error('Card generation failed:', error);
      setGenerationStep(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setGenerationResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadCard = () => {
    if (!generationResult?.blob) return;

    try {
      const filename = generateCardFilename(representative.name);
      downloadCardImage(generationResult.blob, filename);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download card. Please try again.');
    }
  };

  const shareCard = () => {
    if (!generationResult?.blob) return;
    setShowSharePanel(true);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Generate Trading Card</h2>
              <p className="text-indigo-100 mt-1">
                Create and download your card for {representative.name}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-indigo-100 text-2xl font-bold"
            >
              ×
            </button>
          </div>
        </div>

        {/* Browser Support Check */}
        {browserSupport && !browserSupport.supported && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 m-6">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <h3 className="text-sm font-medium text-red-800">Browser Not Supported</h3>
            </div>
            <p className="text-sm text-red-700 mt-1">
              Your browser doesn't support card generation. Please use a modern browser like Chrome, Firefox, or Safari.
            </p>
          </div>
        )}

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Panel - Card Preview */}
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Card Preview</h3>
                <div className="flex justify-center">
                  <div 
                    ref={cardRef}
                    className="transform scale-90 origin-center"
                    style={{ width: '320px', height: '500px' }}
                  >
                    <RepresentativeTradingCard
                      representative={representative}
                      stats={stats}
                      customization={customization}
                    />
                  </div>
                </div>
              </div>

              {/* Stats Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Selected Stats</h4>
                <div className="space-y-2">
                  {stats.map((stat, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <span className="flex items-center">
                        <span className="mr-2">{stat.icon}</span>
                        {stat.label}
                      </span>
                      <span className="font-medium" style={{ color: stat.color }}>
                        {stat.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Panel - Generation Controls or Share Panel */}
            <div className="space-y-6">
              {showSharePanel && generationResult?.success ? (
                <TradingCardSharePanel
                  representative={representative}
                  stats={stats}
                  imageBlob={generationResult.blob}
                  imageUrl={generationResult.dataUrl}
                  onClose={() => setShowSharePanel(false)}
                />
              ) : (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Generate & Download</h3>
                
                {/* Generation Status */}
                {isGenerating && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3"></div>
                      <span className="text-sm text-blue-800">{generationStep}</span>
                    </div>
                  </div>
                )}

                {/* Generation Result */}
                {generationResult && !isGenerating && (
                  <div className={`border rounded-lg p-4 mb-4 ${
                    generationResult.success 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-red-50 border-red-200'
                  }`}>
                    <div className="flex items-center">
                      <svg className={`w-5 h-5 mr-2 ${
                        generationResult.success ? 'text-green-600' : 'text-red-600'
                      }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {generationResult.success ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
                        )}
                      </svg>
                      <span className={`text-sm font-medium ${
                        generationResult.success ? 'text-green-800' : 'text-red-800'
                      }`}>
                        {generationResult.success ? 'Card generated successfully!' : 'Generation failed'}
                      </span>
                    </div>
                    
                    {generationResult.success && generationResult.metadata && (
                      <div className="mt-2 text-xs text-green-700">
                        <p>Size: {generationResult.metadata.width}×{generationResult.metadata.height}px</p>
                        <p>File size: {Math.round(generationResult.metadata.fileSize / 1024)}KB</p>
                        <p>Generation time: {Math.round(generationResult.metadata.generationTime)}ms</p>
                      </div>
                    )}
                    
                    {!generationResult.success && (
                      <p className="mt-1 text-sm text-red-700">{generationResult.error}</p>
                    )}
                  </div>
                )}

                {/* Generated Image Preview */}
                {generationResult?.success && (
                  <div className="mb-4">
                    <h4 className="font-medium text-gray-900 mb-2">Generated Image</h4>
                    <div className="border rounded-lg p-4 bg-gray-50">
                      <canvas
                        ref={canvasRef}
                        className="max-w-full h-auto mx-auto"
                        style={{ maxHeight: '200px' }}
                      />
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="space-y-3">
                  <button
                    onClick={generateCard}
                    disabled={isGenerating || !browserSupport?.supported}
                    className={`w-full flex items-center justify-center px-6 py-3 rounded-lg font-medium transition-colors ${
                      isGenerating || !browserSupport?.supported
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700'
                    }`}
                  >
                    {isGenerating ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Generating...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Generate Card
                      </>
                    )}
                  </button>

                  {generationResult?.success && (
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={downloadCard}
                        className="flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Download
                      </button>
                      
                      <button
                        onClick={shareCard}
                        className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                        </svg>
                        Share
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Browser Support Info */}
              {browserSupport && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Browser Support</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center justify-between">
                      <span>Canvas Support</span>
                      <span className={browserSupport.features.canvas ? 'text-green-600' : 'text-red-600'}>
                        {browserSupport.features.canvas ? '✓' : '✗'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Download Support</span>
                      <span className={browserSupport.features.download ? 'text-green-600' : 'text-red-600'}>
                        {browserSupport.features.download ? '✓' : '✗'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>High-DPI Display</span>
                      <span className={browserSupport.features.highDPI ? 'text-green-600' : 'text-gray-500'}>
                        {browserSupport.features.highDPI ? '✓' : '—'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {browserSupport?.supported 
                ? 'Ready to generate high-quality trading cards'
                : 'Browser not supported for card generation'
              }
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TradingCardGenerator;