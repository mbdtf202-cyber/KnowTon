#!/usr/bin/env node

/**
 * Cache performance benchmark
 * Tests cache performance under various scenarios
 */

import Redis from 'ioredis';
import { performance } from 'perf_hooks';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

interface BenchmarkResult {
  operation: string;
  iterations: number;
  totalTime: number;
  avgTime: number;
  opsPerSecond: number;
}

class CacheBenchmark {
  private redis: Redis;
  private results: BenchmarkResult[] = [];

  constructor() {
    this.redis = new Redis(REDIS_URL);
  }

  /**
   * Run benchmark
   */
  async run(): Promise<void> {
    console.log('🚀 Starting cache benchmark...\n');

    try {
      await this.redis.ping();
      console.log('✅ Redis connected\n');
    } catch (error) {
      console.error('❌ Redis connection failed:', error);
      process.exit(1);
    }

    // Clear test data
    await this.redis.flushdb();

    // Run benchmarks
    await this.benchmarkSet(1000);
    await this.benchmarkGet(1000);
    await this.benchmarkSetWithExpiry(1000);
    await this.benchmarkDelete(1000);
    await this.benchmarkPipeline(1000);
    await this.benchmarkConcurrent(100, 10);

    // Print results
    this.printResults();

    await this.redis.quit();
  }

  /**
   * Benchmark SET operations
   */
  private async benchmarkSet(iterations: number): Promise<void> {
    console.log(`Benchmarking SET (${iterations} iterations)...`);

    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
      await this.redis.set(`bench:set:${i}`, JSON.stringify({ id: i, data: 'test' }));
    }

    const end = performance.now();
    const totalTime = end - start;

    this.results.push({
      operation: 'SET',
      iterations,
      totalTime,
      avgTime: totalTime / iterations,
      opsPerSecond: (iterations / totalTime) * 1000
    });

    console.log(`✅ Completed in ${totalTime.toFixed(2)}ms\n`);
  }

  /**
   * Benchmark GET operations
   */
  private async benchmarkGet(iterations: number): Promise<void> {
    console.log(`Benchmarking GET (${iterations} iterations)...`);

    // Prepare data
    for (let i = 0; i < iterations; i++) {
      await this.redis.set(`bench:get:${i}`, JSON.stringify({ id: i, data: 'test' }));
    }

    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
      await this.redis.get(`bench:get:${i}`);
    }

    const end = performance.now();
    const totalTime = end - start;

    this.results.push({
      operation: 'GET',
      iterations,
      totalTime,
      avgTime: totalTime / iterations,
      opsPerSecond: (iterations / totalTime) * 1000
    });

    console.log(`✅ Completed in ${totalTime.toFixed(2)}ms\n`);
  }

  /**
   * Benchmark SETEX operations
   */
  private async benchmarkSetWithExpiry(iterations: number): Promise<void> {
    console.log(`Benchmarking SETEX (${iterations} iterations)...`);

    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
      await this.redis.setex(`bench:setex:${i}`, 300, JSON.stringify({ id: i, data: 'test' }));
    }

    const end = performance.now();
    const totalTime = end - start;

    this.results.push({
      operation: 'SETEX',
      iterations,
      totalTime,
      avgTime: totalTime / iterations,
      opsPerSecond: (iterations / totalTime) * 1000
    });

    console.log(`✅ Completed in ${totalTime.toFixed(2)}ms\n`);
  }

  /**
   * Benchmark DELETE operations
   */
  private async benchmarkDelete(iterations: number): Promise<void> {
    console.log(`Benchmarking DEL (${iterations} iterations)...`);

    // Prepare data
    for (let i = 0; i < iterations; i++) {
      await this.redis.set(`bench:del:${i}`, JSON.stringify({ id: i, data: 'test' }));
    }

    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
      await this.redis.del(`bench:del:${i}`);
    }

    const end = performance.now();
    const totalTime = end - start;

    this.results.push({
      operation: 'DEL',
      iterations,
      totalTime,
      avgTime: totalTime / iterations,
      opsPerSecond: (iterations / totalTime) * 1000
    });

    console.log(`✅ Completed in ${totalTime.toFixed(2)}ms\n`);
  }

  /**
   * Benchmark pipeline operations
   */
  private async benchmarkPipeline(iterations: number): Promise<void> {
    console.log(`Benchmarking PIPELINE (${iterations} operations)...`);

    const start = performance.now();

    const pipeline = this.redis.pipeline();
    for (let i = 0; i < iterations; i++) {
      pipeline.set(`bench:pipe:${i}`, JSON.stringify({ id: i, data: 'test' }));
    }
    await pipeline.exec();

    const end = performance.now();
    const totalTime = end - start;

    this.results.push({
      operation: 'PIPELINE',
      iterations,
      totalTime,
      avgTime: totalTime / iterations,
      opsPerSecond: (iterations / totalTime) * 1000
    });

    console.log(`✅ Completed in ${totalTime.toFixed(2)}ms\n`);
  }

  /**
   * Benchmark concurrent operations
   */
  private async benchmarkConcurrent(iterations: number, concurrency: number): Promise<void> {
    console.log(`Benchmarking CONCURRENT (${iterations} iterations, ${concurrency} concurrent)...`);

    const start = performance.now();

    const promises: Promise<any>[] = [];
    for (let i = 0; i < iterations; i++) {
      promises.push(
        this.redis.set(`bench:concurrent:${i}`, JSON.stringify({ id: i, data: 'test' }))
      );

      // Execute in batches
      if (promises.length >= concurrency) {
        await Promise.all(promises);
        promises.length = 0;
      }
    }

    // Execute remaining
    if (promises.length > 0) {
      await Promise.all(promises);
    }

    const end = performance.now();
    const totalTime = end - start;

    this.results.push({
      operation: `CONCURRENT (${concurrency})`,
      iterations,
      totalTime,
      avgTime: totalTime / iterations,
      opsPerSecond: (iterations / totalTime) * 1000
    });

    console.log(`✅ Completed in ${totalTime.toFixed(2)}ms\n`);
  }

  /**
   * Print benchmark results
   */
  private printResults(): void {
    console.log('\n' + '='.repeat(80));
    console.log('BENCHMARK RESULTS');
    console.log('='.repeat(80));
    console.log();

    console.log('┌─────────────────────┬────────────┬──────────────┬──────────────┬──────────────┐');
    console.log('│ Operation           │ Iterations │ Total Time   │ Avg Time     │ Ops/Second   │');
    console.log('├─────────────────────┼────────────┼──────────────┼──────────────┼──────────────┤');

    for (const result of this.results) {
      console.log(
        `│ ${result.operation.padEnd(19)} │ ` +
        `${result.iterations.toString().padStart(10)} │ ` +
        `${result.totalTime.toFixed(2).padStart(10)}ms │ ` +
        `${result.avgTime.toFixed(3).padStart(10)}ms │ ` +
        `${result.opsPerSecond.toFixed(0).padStart(12)} │`
      );
    }

    console.log('└─────────────────────┴────────────┴──────────────┴──────────────┴──────────────┘');
    console.log();

    // Summary
    const totalOps = this.results.reduce((sum, r) => sum + r.iterations, 0);
    const totalTime = this.results.reduce((sum, r) => sum + r.totalTime, 0);
    const avgOpsPerSecond = this.results.reduce((sum, r) => sum + r.opsPerSecond, 0) / this.results.length;

    console.log('Summary:');
    console.log(`  Total Operations: ${totalOps}`);
    console.log(`  Total Time: ${totalTime.toFixed(2)}ms`);
    console.log(`  Average Ops/Second: ${avgOpsPerSecond.toFixed(0)}`);
    console.log();

    // Recommendations
    console.log('Recommendations:');
    const pipelineResult = this.results.find(r => r.operation === 'PIPELINE');
    const setResult = this.results.find(r => r.operation === 'SET');

    if (pipelineResult && setResult) {
      const improvement = ((pipelineResult.opsPerSecond / setResult.opsPerSecond) - 1) * 100;
      console.log(`  ✅ Pipeline is ${improvement.toFixed(0)}% faster than individual operations`);
      console.log('     Use pipeline for batch operations');
    }

    const concurrentResult = this.results.find(r => r.operation.startsWith('CONCURRENT'));
    if (concurrentResult && setResult) {
      const improvement = ((concurrentResult.opsPerSecond / setResult.opsPerSecond) - 1) * 100;
      console.log(`  ✅ Concurrent operations are ${improvement.toFixed(0)}% faster`);
      console.log('     Use Promise.all() for parallel operations');
    }

    console.log();
    console.log('='.repeat(80));
  }
}

// Run benchmark
const benchmark = new CacheBenchmark();
benchmark.run().catch(error => {
  console.error('Benchmark failed:', error);
  process.exit(1);
});
