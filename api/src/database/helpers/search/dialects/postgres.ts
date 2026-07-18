import type { Knex } from 'knex';
import { SearchDatabaseHelper } from '../types.js';

export class SearchHelperPostgres extends SearchDatabaseHelper {
	addSearchCondition(
		dbQuery: Knex.QueryBuilder,
		collection: string,
		name: string,
		searchQuery: string,
		logical: 'and' | 'or',
	): Knex.QueryBuilder {
		return dbQuery[logical].whereRaw(
			`to_tsvector('english', ??) @@ plainto_tsquery('english', ?)`,
			[`${collection}.${name}`, searchQuery],
		);
	}
}
