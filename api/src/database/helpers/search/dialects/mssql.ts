import type { Knex } from 'knex';
import { SearchDatabaseHelper } from '../types.js';

export class SearchHelperMSSQL extends SearchDatabaseHelper {
	addFulltextCondition(
		dbQuery: Knex.QueryBuilder,
		collection: string,
		field: string,
		term: string,
		logical: 'and' | 'or',
	): void {
		dbQuery[logical].whereRaw(`CONTAINS(??, ?)`, [`${collection}.${field}`, `"${term}"`]);
	}

	addFuzzyCondition(
		dbQuery: Knex.QueryBuilder,
		collection: string,
		field: string,
		term: string,
		logical: 'and' | 'or',
	): void {
		this.addContainsCondition(dbQuery, collection, field, term, logical);
	}
}
