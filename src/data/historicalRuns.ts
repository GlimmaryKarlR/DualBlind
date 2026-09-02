import { BenchmarkRunRecord } from '../types/benchmark';

/**
 * Universal benchmark run registry.
 * Hardcoded baseline runs have been migrated into Cloud Firestore.
 * All live runs are fetched and synchronized via Cloud Firestore in real time.
 */
export const HISTORICAL_BENCHMARK_RUNS: BenchmarkRunRecord[] = [];
