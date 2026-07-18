import type { Knex } from 'knex';
import { SearchDatabaseHelper } from '../types.js';

export class SearchHelperMySQL extends SearchDatabaseHelper {
	addSearchCondition(
		dbQuery: Knex.QueryBuilder,
		collection: string,
		name: string,
		searchQuery: string,
		logical: 'and' | 'or',
	): Knex.QueryBuilder {
		return dbQuery[logical].whereRaw(`MATCH(??) AGAINST(? IN BOOLEAN MODE)`, [
			`${collection}.${name}`,
			searchQuery,
		]);
	}
}
