import type { Knex } from 'knex';
import { DatabaseHelper } from '../types.js';

export abstract class SearchDatabaseHelper extends DatabaseHelper {
	abstract addSearchCondition(
		dbQuery: Knex.QueryBuilder,
		collection: string,
		name: string,
		searchQuery: string,
		logical: 'and' | 'or',
	): Knex.QueryBuilder;
}
