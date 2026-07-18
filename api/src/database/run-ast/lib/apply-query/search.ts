import { NUMERIC_TYPES } from '@directus/constants';
import type { FieldOverview, NumericType, Permission, SchemaOverview, SearchInput } from '@directus/types';
import { isIn } from '@directus/utils';
import type { Knex } from 'knex';
import { getCases } from '../../../../permissions/modules/process-ast/lib/get-cases.js';
import type { AliasMap } from '../../../../utils/get-column-path.js';
import { isValidUuid } from '../../../../utils/is-valid-uuid.js';
import { parseNumericString } from '../../../../utils/parse-numeric-string.js';
import { getHelpers } from '../../../helpers/index.js';
import { applyFilter } from './filter/index.js';

export function applySearch(
	knex: Knex,
	schema: SchemaOverview,
	dbQuery: Knex.QueryBuilder,
	searchQuery: string | SearchInput,
	collection: string,
	aliasMap: AliasMap,
	permissions: Permission[],
) {
	const { number: numberHelper, search: searchHelper } = getHelpers(knex);

	if (typeof searchQuery === 'string') {
		applyLegacySearch(knex, schema, dbQuery, searchQuery, collection, aliasMap, permissions, numberHelper);
		return;
	}

	applyStructuredSearch(knex, schema, dbQuery, searchQuery, collection, aliasMap, permissions, numberHelper, searchHelper);
}

function applyStructuredSearch(
	knex: Knex,
	schema: SchemaOverview,
	dbQuery: Knex.QueryBuilder,
	search: SearchInput,
	collection: string,
	aliasMap: AliasMap,
	permissions: Permission[],
	numberHelper: any,
	searchHelper: any,
) {
	const mode = search.mode ?? 'contains';
	const isAll = search.operator === 'and';

	const allowedFields = new Set(permissions.filter((p) => p.collection === collection).flatMap((p) => p.fields ?? []));

	let fields = Object.entries(schema.collections[collection]!.fields);

	fields = fields.filter(([_name, field]) => field.searchable !== false && field.special.includes('conceal') !== true);

	const { cases, caseMap } = getCases(collection, permissions, []);

	if (cases.length !== 0 && !allowedFields.has('*')) {
		fields = fields.filter((field) => allowedFields.has(field[0]));
	}

	if (search.fields && search.fields.length > 0) {
		const fieldSet = new Set(search.fields);
		fields = fields.filter(([name]) => fieldSet.has(name));
	}

	if (fields.length === 0) return;

	const term = search.query;

	if (isAll) {
		dbQuery.andWhere(function (queryBuilder) {
			fields.forEach(([name, field]) => {
				const whenCases = allowedFields.has('*') ? [] : (caseMap[name] ?? []).map((caseIndex) => cases[caseIndex]!);
				const fieldType = getFieldType(field, term, numberHelper);
				if (fieldType === null) return;

				if (cases.length !== 0 && whenCases?.length !== 0) {
					queryBuilder.andWhere((subQuery) => {
						addStructuredCondition(subQuery, collection, name, fieldType, term, mode, numberHelper, searchHelper);
						applyFilter(knex, schema, subQuery, { _or: whenCases }, collection, aliasMap, cases, permissions);
					});
				} else {
					queryBuilder.andWhere((subQuery) => {
						addStructuredCondition(subQuery, collection, name, fieldType, term, mode, numberHelper, searchHelper);
					});
				}
			});
		});
	} else {
		dbQuery.andWhere(function (queryBuilder) {
			let needsFallbackCondition = true;

			fields.forEach(([name, field]) => {
				const whenCases = allowedFields.has('*') ? [] : (caseMap[name] ?? []).map((caseIndex) => cases[caseIndex]!);
				const fieldType = getFieldType(field, term, numberHelper);
				if (fieldType !== null) {
					needsFallbackCondition = false;
				} else {
					return;
				}

				if (cases.length !== 0 && whenCases?.length !== 0) {
					queryBuilder.orWhere((subQuery) => {
						addStructuredCondition(subQuery, collection, name, fieldType, term, mode, numberHelper, searchHelper);
						applyFilter(knex, schema, subQuery, { _or: whenCases }, collection, aliasMap, cases, permissions);
					});
				} else {
					queryBuilder.orWhere((subQuery) => {
						addStructuredCondition(subQuery, collection, name, fieldType, term, mode, numberHelper, searchHelper);
					});
				}
			});

			if (needsFallbackCondition) {
				queryBuilder.orWhereRaw('1 = 0');
			}
		});
	}
}

function addStructuredCondition(
	dbQuery: Knex.QueryBuilder,
	collection: string,
	name: string,
	fieldType: 'string' | 'numeric' | 'uuid' | null,
	term: string,
	mode: string,
	numberHelper: any,
	searchHelper: any,
) {
	if (fieldType === null) return;

	if (fieldType === 'string') {
		switch (mode) {
			case 'exact':
				searchHelper.addExactCondition(dbQuery, collection, name, term, 'and');
				break;
			case 'starts_with':
				searchHelper.addStartsWithCondition(dbQuery, collection, name, term, 'and');
				break;
			case 'ends_with':
				searchHelper.addEndsWithCondition(dbQuery, collection, name, term, 'and');
				break;
			case 'fulltext':
				searchHelper.addFulltextCondition(dbQuery, collection, name, term, 'and');
				break;
			case 'fuzzy':
				searchHelper.addFuzzyCondition(dbQuery, collection, name, term, 'and');
				break;
			default:
				searchHelper.addContainsCondition(dbQuery, collection, name, term, 'and');
				break;
		}
	} else if (fieldType === 'numeric') {
		if (mode === 'exact') {
			dbQuery.where({ [`${collection}.${name}`]: parseNumericString(term) });
		} else {
			numberHelper.addSearchCondition(dbQuery, collection, name, parseNumericString(term)!, 'and');
		}
	} else if (fieldType === 'uuid') {
		dbQuery.where({ [`${collection}.${name}`]: term });
	}
}

var _addLegacyCondition = function (
	dbQuery: Knex.QueryBuilder,
	name: string,
	fieldType: 'string' | 'numeric' | 'uuid' | null,
	numberHelper: any,
	term: string,
	logical: 'and' | 'or',
	legacyCollection: string,
) {
	if (fieldType === null) return;

	if (fieldType === 'string') {
		if (logical === 'or') {
			dbQuery.orWhereRaw(`LOWER(??) LIKE ?`, [`${legacyCollection}.${name}`, `%${term.toLowerCase()}%`]);
		} else {
			dbQuery.whereRaw(`LOWER(??) LIKE ?`, [`${legacyCollection}.${name}`, `%${term.toLowerCase()}%`]);
		}
	} else if (fieldType === 'numeric') {
		numberHelper.addSearchCondition(dbQuery, legacyCollection, name, parseNumericString(term)!, logical);
	} else if (fieldType === 'uuid') {
		if (logical === 'or') {
			dbQuery.orWhere({ [`${legacyCollection}.${name}`]: term });
		} else {
			dbQuery.where({ [`${legacyCollection}.${name}`]: term });
		}
	}
};

function applyLegacySearch(
	knex: Knex,
	schema: SchemaOverview,
	dbQuery: Knex.QueryBuilder,
	searchQuery: string,
	collection: string,
	aliasMap: AliasMap,
	permissions: Permission[],
	numberHelper: any,
) {
	const allowedFields = new Set(permissions.filter((p) => p.collection === collection).flatMap((p) => p.fields ?? []));

	let fields = Object.entries(schema.collections[collection]!.fields);

	fields = fields.filter(([_name, field]) => field.searchable !== false && field.special.includes('conceal') !== true);

	const { cases, caseMap } = getCases(collection, permissions, []);

	if (cases.length !== 0 && !allowedFields.has('*')) {
		fields = fields.filter((field) => allowedFields.has(field[0]));
	}

	dbQuery.andWhere(function (queryBuilder) {
		let needsFallbackCondition = true;

		fields.forEach(([name, field]) => {
			const whenCases = allowedFields.has('*') ? [] : (caseMap[name] ?? []).map((caseIndex) => cases[caseIndex]!);

			const fieldType = getFieldType(field, searchQuery, numberHelper);

			if (fieldType !== null) {
				needsFallbackCondition = false;
			} else {
				return;
			}

			if (cases.length !== 0 && whenCases?.length !== 0) {
				queryBuilder.orWhere((subQuery) => {
					_addLegacyCondition(subQuery, name, fieldType, numberHelper, searchQuery, 'and', collection);
					applyFilter(knex, schema, subQuery, { _or: whenCases }, collection, aliasMap, cases, permissions);
				});
			} else {
				_addLegacyCondition(queryBuilder, name, fieldType, numberHelper, searchQuery, 'or', collection);
			}
		});

		if (needsFallbackCondition) {
			queryBuilder.orWhereRaw('1 = 0');
		}
	});
}

function getFieldType(
	field: FieldOverview,
	searchQuery: string,
	numberHelper: any,
): null | 'string' | 'numeric' | 'uuid' {
	if (['text', 'string'].includes(field.type)) {
		return 'string';
	}

	if (isNumericField(field)) {
		const number = parseNumericString(searchQuery);
		if (number !== null && numberHelper.isNumberValid(number, field)) {
			return 'numeric';
		}
	}

	if (field.type === 'uuid' && isValidUuid(searchQuery)) {
		return 'uuid';
	}

	return null;
}

function isNumericField(field: FieldOverview): field is FieldOverview & { type: NumericType } {
	return isIn(field.type, NUMERIC_TYPES);
}
