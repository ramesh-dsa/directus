import type { Knex } from 'knex';
import { SearchDatabaseHelper } from '../types.js';

export class SearchHelperDefault extends SearchDatabaseHelper {
	addSearchCondition(
		dbQuery: Knex.QueryBuilder,
		collection: string,
		name: string,
		searchQuery: string,
		logical: 'and' | 'or',
	): Knex.QueryBuilder {
		return dbQuery[logical].whereRaw(`LOWER(??) LIKE ?`, [
			`${collection}.${name}`,
			`%${searchQuery.toLowerCase()}%`,
		]);
	}
}
