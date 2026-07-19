export default function({ action }, { services, database, getSchema, logger }) {
	const { DashboardsService, PanelsService } = services;

	async function createPanelsForCollection(collectionName) {
		try {
			if (!collectionName || collectionName.startsWith('directus_')) return;

			const schema = await getSchema();

			const dashboardsService = new DashboardsService({ schema, knex: database });

			const dashboards = await dashboardsService.readByQuery({
				filter: { name: { _eq: 'Dashboard' } },
				limit: 1,
				fields: ['id'],
			});

			if (!dashboards || dashboards.length === 0) {
				logger.warn('Auto-Dashboard: No "Dashboard" dashboard found');
				return;
			}

			const dashboardId = dashboards[0].id;

			const panelsService = new PanelsService({ schema, knex: database });

			const existingPanels = await panelsService.readByQuery({
				filter: { dashboard: { _eq: dashboardId } },
				fields: ['position_y', 'height'],
			});

			const maxY = existingPanels.reduce((max, p) => Math.max(max, p.position_y + p.height), 0);
			const nextY = maxY + 2;

			const collectionInfo = schema.collections[collectionName];
			if (!collectionInfo) {
				logger.warn(`Auto-Dashboard: Collection "${collectionName}" not in schema yet`);
				return;
			}

			const pkFieldName = collectionInfo.primary;
			const fieldEntries = Object.entries(collectionInfo.fields).map(([name, info]) => ({
				field: name,
				type: info.type,
			}));

			const pkField = { field: pkFieldName };
			const stringFields = fieldEntries.filter((f) => ['string', 'text', 'varchar', 'char'].includes(f.type));
			const numericFields = fieldEntries.filter((f) => f.field !== pkFieldName && ['integer', 'bigInteger', 'float', 'decimal'].includes(f.type));

			const newPanels = [];

			newPanels.push({
				dashboard: dashboardId,
				name: `${collectionName} - Total Count`,
				icon: 'database',
				type: 'metric',
				position_x: 4,
				position_y: nextY,
				width: 12,
				height: 8,
				show_header: true,
				options: {
					collection: collectionName,
					field: pkField.field,
					function: 'count',
					sortField: pkField.field,
				},
			});

			if (stringFields.length > 0) {
				newPanels.push({
					dashboard: dashboardId,
					name: `${collectionName} - ${stringFields[0].field} Distribution`,
					icon: 'donut_small',
					type: 'pie-chart',
					position_x: 4,
					position_y: nextY + 10,
					width: 24,
					height: 22,
					show_header: true,
					options: {
						collection: collectionName,
						column: stringFields[0].field,
						donut: true,
						legend: 'bottom',
						showLabels: true,
						color: '#6644FF',
					},
				});
			}

			if (numericFields.length > 0) {
				newPanels.push({
					dashboard: dashboardId,
					name: `${collectionName} - Average ${numericFields[0].field}`,
					icon: 'functions',
					type: 'metric',
					position_x: 20,
					position_y: nextY,
					width: 12,
					height: 8,
					show_header: true,
					options: {
						collection: collectionName,
						field: numericFields[0].field,
						function: 'avg',
						sortField: pkField.field,
					},
				});
			}

			if (stringFields.length > 1) {
				newPanels.push({
					dashboard: dashboardId,
					name: `${collectionName} - ${stringFields[1].field} Distribution`,
					icon: 'bar_chart',
					type: 'bar-chart',
					position_x: 30,
					position_y: nextY + 10,
					width: 22,
					height: 22,
					show_header: true,
					options: {
						collection: collectionName,
						xAxis: stringFields[1].field,
						yAxis: pkField.field,
						function: 'count',
						horizontal: true,
					},
				});
			}

			for (const panel of newPanels) {
				await panelsService.createOne(panel);
			}

			logger.info(`Auto-Dashboard: Created ${newPanels.length} panel(s) for "${collectionName}"`);
		} catch (err) {
			logger.error(`Auto-Dashboard Error: ${err.message}`);
		}
	}

	action('collections.create', async (meta) => {
		logger.info(`Auto-Dashboard: Collection created: "${meta.key}"`);
		await createPanelsForCollection(meta.key);
	});
}
