const fs = require('fs');
const path = require('path');

// Helper function to compare strings (case-insensitive, trimmed)
function compareStrings(actual, expected) {
  return actual.toLowerCase().trim() === expected.toLowerCase().trim();
}

// Helper function to read JSONL file
function readJSONL(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  return content.split('\n')
    .filter(line => line.trim())
    .map(line => JSON.parse(line));
}

// Verify translation results
function verifyTranslation(entry) {
  if (entry.service !== 'translation') return null;
  
  const actual = entry.response?.output?.[0]?.target;
  const expected = entry.expected;
  
  if (!actual || !expected) return false;
  return compareStrings(actual, expected);
}

// Verify TTS results
function verifyTTS(entry) {
  if (entry.service !== 'tts') return null;
  
  const hasAudio = entry.response?.audio?.[0]?.audioContent;
  return hasAudio ? true : false;
}

// Verify ASR results
function verifyASR(entry) {
  if (entry.service !== 'asr') return null;
  
  const actual = entry.response?.output?.[0]?.transcript || entry.response?.output?.[0]?.source;
  const expected = entry.expected;
  
  if (!actual || !expected) return false;
  return compareStrings(actual, expected);
}

// Main verification function
function verifyResults() {
  const logFile = path.join(__dirname, 'load-test-outputs.jsonl');
  
  if (!fs.existsSync(logFile)) {
    console.error('❌ No load test output file found. Please run load-test.js first.');
    process.exit(1);
  }

  console.log('Reading load test results...');
  const entries = readJSONL(logFile);
  
  // Initialize counters
  const results = {
    translation: { passed: 0, failed: 0, error: 0 },
    tts: { passed: 0, failed: 0, error: 0 },
    asr: { passed: 0, failed: 0, error: 0 }
  };

  // Process each entry
  entries.forEach(entry => {
    if (!entry.service) return;

    let verification = null;
    switch (entry.service) {
      case 'translation':
        verification = verifyTranslation(entry);
        break;
      case 'tts':
        verification = verifyTTS(entry);
        break;
      case 'asr':
        verification = verifyASR(entry);
        break;
    }

    if (verification === null) return;

    if (entry.error) {
      results[entry.service].error++;
    } else if (verification) {
      results[entry.service].passed++;
    } else {
      results[entry.service].failed++;
    }
  });

  // Print summary
  console.log('\n=== Load Test Verification Summary ===');
  
  Object.entries(results).forEach(([service, stats]) => {
    const total = stats.passed + stats.failed + stats.error;
    if (total === 0) return;

    console.log(`\n${service.toUpperCase()}:`);
    console.log(`  Total tests: ${total}`);
    console.log(`  Passed: ${stats.passed} (${((stats.passed/total)*100).toFixed(1)}%)`);
    console.log(`  Failed: ${stats.failed} (${((stats.failed/total)*100).toFixed(1)}%)`);
    console.log(`  Errors: ${stats.error} (${((stats.error/total)*100).toFixed(1)}%)`);
  });

  // Print overall statistics
  const totalTests = Object.values(results).reduce((sum, stats) => 
    sum + stats.passed + stats.failed + stats.error, 0);
  const totalPassed = Object.values(results).reduce((sum, stats) => 
    sum + stats.passed, 0);
  const totalFailed = Object.values(results).reduce((sum, stats) => 
    sum + stats.failed, 0);
  const totalErrors = Object.values(results).reduce((sum, stats) => 
    sum + stats.error, 0);

  console.log('\n=== Overall Statistics ===');
  console.log(`Total tests: ${totalTests}`);
  console.log(`Passed: ${totalPassed} (${((totalPassed/totalTests)*100).toFixed(1)}%)`);
  console.log(`Failed: ${totalFailed} (${((totalFailed/totalTests)*100).toFixed(1)}%)`);
  console.log(`Errors: ${totalErrors} (${((totalErrors/totalTests)*100).toFixed(1)}%)`);

  // Print timestamp range
  if (entries.length > 0) {
    const timestamps = entries.map(e => new Date(e.timestamp));
    const startTime = new Date(Math.min(...timestamps));
    const endTime = new Date(Math.max(...timestamps));
    console.log('\n=== Test Duration ===');
    console.log(`Start: ${startTime.toLocaleString()}`);
    console.log(`End: ${endTime.toLocaleString()}`);
    console.log(`Duration: ${((endTime - startTime)/1000/60).toFixed(1)} minutes`);
  }
}

verifyResults(); 