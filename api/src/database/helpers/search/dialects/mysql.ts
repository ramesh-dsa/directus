import type { Knex } from 'knex';
import { SearchDatabaseHelper } from '../types.js';

export class SearchHelperMySQL extends SearchDatabaseHelper {
	addFulltextCondition(
		dbQuery: Knex.QueryBuilder,
		collection: string,
		field: string,
		term: string,
		logical: 'and' | 'or',
	): void {
		dbQuery[logical].whereRaw(`MATCH(??) AGAINST(? IN BOOLEAN MODE)`, [
			`${collection}.${field}`,
			term,
		]);
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
