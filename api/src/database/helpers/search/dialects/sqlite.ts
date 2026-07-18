import type { Knex } from 'knex';
import { SearchDatabaseHelper } from '../types.js';

export class SearchHelperSQLite extends SearchDatabaseHelper {
	addSearchCondition(
		dbQuery: Knex.QueryBuilder,
		collection: string,
		name: string,
		searchQuery: string,
		logical: 'and' | 'or',
	): Knex.QueryBuilder {
		return dbQuery[logical].whereRaw(`LOWER(??) LIKE ? ESCAPE '\\'`, [
			`${collection}.${name}`,
			`%${searchQuery.toLowerCase()}%`,
		]);
	}
}
