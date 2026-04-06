/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * AI Provider Abstraction
 *
 * Provider-agnostic wrapper using Vercel AI SDK.
 * Supports Google Gemini (primary), OpenAI (fallback).
 *
 * Future: Add Ollama for self-hosted inference:
 *   npm install ollama-ai-provider
 *   import { ollama } from 'ollama-ai-provider';
 *   if (process.env.OLLAMA_BASE_URL) return ollama(modelId);
 */

import { generateText, streamText, type LanguageModel } from 'ai';
import { google } from '@ai-sdk/google';
import logger from '@/lib/logging/simple-logger';

interface GenerateAITextOptions {
  temperature?: number;
  maxTokens?: number;
}

function getModel(): LanguageModel {
  const modelId = process.env.AI_MODEL || 'gemini-2.5-flash-lite';

  // Future: Ollama support
  // if (process.env.OLLAMA_BASE_URL) {
  //   return ollama(modelId);
  // }

  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return google(modelId);
  }

  throw new Error(
    'No AI provider configured. Set GOOGLE_GENERATIVE_AI_API_KEY in environment variables.'
  );
}

export async function generateAIText(
  systemPrompt: string,
  userPrompt: string,
  options: GenerateAITextOptions = {}
): Promise<string> {
  const { temperature = 0.3, maxTokens = 1000 } = options;

  const model = getModel();

  const result = await generateText({
    model,
    system: systemPrompt,
    prompt: userPrompt,
    temperature,
    maxOutputTokens: maxTokens,
  });

  logger.info('AI text generated', {
    provider: process.env.GOOGLE_GENERATIVE_AI_API_KEY ? 'google' : 'unknown',
    model: process.env.AI_MODEL || 'gemini-2.5-flash-lite',
    inputTokens: result.usage?.inputTokens,
    outputTokens: result.usage?.outputTokens,
    operation: 'ai_generate_text',
  });

  return result.text;
}

export function streamAIText(
  systemPrompt: string,
  userPrompt: string,
  options: GenerateAITextOptions = {}
) {
  const { temperature = 0.3, maxTokens = 1000 } = options;

  const model = getModel();

  logger.info('AI text stream started', {
    provider: process.env.GOOGLE_GENERATIVE_AI_API_KEY ? 'google' : 'unknown',
    model: process.env.AI_MODEL || 'gemini-2.5-flash-lite',
    operation: 'ai_stream_text',
  });

  return streamText({
    model,
    system: systemPrompt,
    prompt: userPrompt,
    temperature,
    maxOutputTokens: maxTokens,
  });
}
