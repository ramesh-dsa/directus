import type { Knex } from 'knex';
import { SearchDatabaseHelper } from '../types.js';

export class SearchHelperOracle extends SearchDatabaseHelper {
	addFulltextCondition(
		dbQuery: Knex.QueryBuilder,
		collection: string,
		field: string,
		term: string,
		logical: 'and' | 'or',
	): void {
		dbQuery[logical].whereRaw(`CONTAINS(??, ?) > 0`, [`${collection}.${field}`, term]);
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
