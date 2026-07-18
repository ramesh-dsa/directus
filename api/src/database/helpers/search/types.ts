import type { Knex } from 'knex';
import { DatabaseHelper } from '../types.js';

export abstract class SearchDatabaseHelper extends DatabaseHelper {
	abstract addFulltextCondition(
		dbQuery: Knex.QueryBuilder,
		collection: string,
		field: string,
		term: string,
		logical: 'and' | 'or',
	): void;

	abstract addFuzzyCondition(
		dbQuery: Knex.QueryBuilder,
		collection: string,
		field: string,
		term: string,
		logical: 'and' | 'or',
	): void;

	addContainsCondition(
		dbQuery: Knex.QueryBuilder,
		collection: string,
		field: string,
		term: string,
		logical: 'and' | 'or',
	): void {
		dbQuery[logical].whereRaw(`LOWER(??) LIKE ?`, [`${collection}.${field}`, `%${term.toLowerCase()}%`]);
	}

	addExactCondition(
		dbQuery: Knex.QueryBuilder,
		collection: string,
		field: string,
		term: string,
		logical: 'and' | 'or',
	): void {
		dbQuery[logical].whereRaw(`LOWER(??) = ?`, [`${collection}.${field}`, term.toLowerCase()]);
	}

	addStartsWithCondition(
		dbQuery: Knex.QueryBuilder,
		collection: string,
		field: string,
		term: string,
		logical: 'and' | 'or',
	): void {
		dbQuery[logical].whereRaw(`LOWER(??) LIKE ?`, [`${collection}.${field}`, `${term.toLowerCase()}%`]);
	}

	addEndsWithCondition(
		dbQuery: Knex.QueryBuilder,
		collection: string,
		field: string,
		term: string,
		logical: 'and' | 'or',
	): void {
		dbQuery[logical].whereRaw(`LOWER(??) LIKE ?`, [`${collection}.${field}`, `%${term.toLowerCase()}`]);
	}
}
