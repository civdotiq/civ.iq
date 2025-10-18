/**
 * Performance test for YAML parser optimization
 * Tests the async chunked parser with real congress-legislators files
 */

import yaml from 'js-yaml';

/**
 * Async chunked YAML parser (same as implementation)
 */
async function parseCongressLegilatorsYAMLAsync(yamlText) {
  const startTime = Date.now();
  const sizeInMB = yamlText.length / (1024 * 1024);

  try {
    // For smaller files, use standard parsing
    if (sizeInMB <= 5) {
      console.log(`[Standard] Parsing ${sizeInMB.toFixed(2)} MB file...`);
      const data = yaml.load(yamlText);

      if (!Array.isArray(data)) {
        throw new Error('Invalid YAML format: expected array of legislators');
      }

      const duration = Date.now() - startTime;
      console.log(`[Standard] ✅ Parsed ${data.length} legislators in ${duration}ms`);
      return { data, duration, method: 'standard', sizeInMB };
    }

    // For larger files, use chunked processing with event loop yielding
    console.log(
      `[Chunked] Large file detected (${sizeInMB.toFixed(2)} MB), using chunked parsing...`
    );

    const parseStart = Date.now();
    const data = yaml.load(yamlText);
    const parseTime = Date.now() - parseStart;

    if (!Array.isArray(data)) {
      throw new Error('Invalid YAML format: expected array of legislators');
    }

    console.log(`[Chunked] YAML parsed in ${parseTime}ms, now processing chunks...`);

    // Process results in chunks to avoid blocking event loop
    const CHUNK_SIZE = 100;
    const processedData = [];
    let chunksProcessed = 0;

    for (let i = 0; i < data.length; i += CHUNK_SIZE) {
      const chunk = data.slice(i, i + CHUNK_SIZE);
      processedData.push(...chunk);
      chunksProcessed++;

      // Yield to event loop every chunk to prevent blocking
      if (i + CHUNK_SIZE < data.length) {
        await new Promise(resolve => setImmediate(resolve));
      }
    }

    const duration = Date.now() - startTime;
    console.log(
      `[Chunked] ✅ Parsed ${processedData.length} legislators in ${duration}ms (${chunksProcessed} chunks)`
    );
    return {
      data: processedData,
      duration,
      method: 'chunked',
      sizeInMB,
      chunksProcessed,
      parseTime,
    };
  } catch (error) {
    console.error('❌ Error parsing YAML:', error.message);
    return null;
  }
}

/**
 * Standard synchronous parser for comparison
 */
function parseCongressLegilatorsYAMLSync(yamlText) {
  const startTime = Date.now();
  const sizeInMB = yamlText.length / (1024 * 1024);

  try {
    console.log(`[Sync] Parsing ${sizeInMB.toFixed(2)} MB file...`);
    const data = yaml.load(yamlText);

    if (!Array.isArray(data)) {
      throw new Error('Invalid YAML format: expected array of legislators');
    }

    const duration = Date.now() - startTime;
    console.log(`[Sync] ✅ Parsed ${data.length} legislators in ${duration}ms`);
    return { data, duration, method: 'sync', sizeInMB };
  } catch (error) {
    console.error('❌ Error parsing YAML:', error.message);
    return null;
  }
}

/**
 * Main test function
 */
async function runPerformanceTest() {
  console.log('\n🧪 YAML Parser Performance Test\n' + '='.repeat(50) + '\n');

  const files = [
    {
      name: 'legislators-current.yaml',
      url: 'https://raw.githubusercontent.com/unitedstates/congress-legislators/main/legislators-current.yaml',
      expectedSize: '~1 MB',
    },
    {
      name: 'legislators-historical.yaml',
      url: 'https://raw.githubusercontent.com/unitedstates/congress-legislators/main/legislators-historical.yaml',
      expectedSize: '~8.6 MB',
    },
  ];

  for (const file of files) {
    console.log(`\n📥 Fetching ${file.name} (${file.expectedSize})...`);

    try {
      const response = await fetch(file.url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const yamlText = await response.text();
      const actualSize = (yamlText.length / (1024 * 1024)).toFixed(2);
      console.log(`✅ Downloaded ${actualSize} MB\n`);

      // Test 1: Synchronous parser
      console.log('Test 1: Synchronous Parser');
      console.log('-'.repeat(30));
      const syncResult = parseCongressLegilatorsYAMLSync(yamlText);

      // Wait a bit between tests
      await new Promise(resolve => setTimeout(resolve, 100));

      // Test 2: Async chunked parser
      console.log('\nTest 2: Async Chunked Parser');
      console.log('-'.repeat(30));
      const asyncResult = await parseCongressLegilatorsYAMLAsync(yamlText);

      // Performance comparison
      if (syncResult && asyncResult) {
        console.log('\n📊 Performance Comparison:');
        console.log('-'.repeat(30));
        console.log(`File Size: ${actualSize} MB`);
        console.log(`Records: ${syncResult.data.length.toLocaleString()}`);
        console.log(`Sync Time: ${syncResult.duration}ms`);
        console.log(`Async Time: ${asyncResult.duration}ms`);

        if (asyncResult.method === 'chunked') {
          console.log(`  - Parse Time: ${asyncResult.parseTime}ms`);
          console.log(`  - Chunk Processing: ${asyncResult.duration - asyncResult.parseTime}ms`);
          console.log(`  - Chunks: ${asyncResult.chunksProcessed}`);
        }

        const improvement = syncResult.duration - asyncResult.duration;
        const improvementPercent = ((improvement / syncResult.duration) * 100).toFixed(1);

        if (improvement > 0) {
          console.log(`⚡ Async ${improvement}ms faster (${improvementPercent}% improvement)`);
        } else {
          console.log(
            `⚠️  Async ${Math.abs(improvement)}ms slower (${Math.abs(improvementPercent)}% overhead for chunking)`
          );
        }
      }
    } catch (error) {
      console.error(`❌ Error testing ${file.name}:`, error.message);
    }

    console.log('\n' + '='.repeat(50));
  }

  console.log('\n✅ Performance test complete!\n');
}

// Run the test
runPerformanceTest().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
