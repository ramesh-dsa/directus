import type { Knex } from 'knex';
import { SearchDatabaseHelper } from '../types.js';

export class SearchHelperPostgres extends SearchDatabaseHelper {
	addFulltextCondition(
		dbQuery: Knex.QueryBuilder,
		collection: string,
		field: string,
		term: string,
		logical: 'and' | 'or',
	): void {
		const vector = `to_tsvector('english', ${this.knex.ref(`${collection}.${field}`)})`;
		const query = `plainto_tsquery('english', ${this.knex.raw('?', [term])})`;
		dbQuery[logical].whereRaw(`${vector} @@ ${query}`);
	}

	addFuzzyCondition(
		dbQuery: Knex.QueryBuilder,
		collection: string,
		field: string,
		term: string,
		logical: 'and' | 'or',
	): void {
		dbQuery[logical].whereRaw(`similarity(??, ?) > 0.3`, [`${collection}.${field}`, term]);
	}
}
