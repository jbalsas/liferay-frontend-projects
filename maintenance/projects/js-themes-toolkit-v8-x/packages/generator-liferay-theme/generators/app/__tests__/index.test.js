/**
 * SPDX-FileCopyrightText: © 2017 Liferay, Inc. <https://liferay.com>
 * SPDX-License-Identifier: MIT
 */

const chai = require('chai');
const chaiFs = require('chai-fs');
const chalk = require('chalk');
const _ = require('lodash');
const sinon = require('sinon');

const liferayThemeApp = require('../index');

chai.use(chaiFs);

const chaiAssert = chai.assert;
const sinonAssert = sinon.assert;

describe('liferay-theme:app unit tests', () => {
	var prototype;

	beforeEach(() => {
		prototype = _.create(liferayThemeApp.prototype);
	});

	describe('_getArgs', () => {
		it('creates new args object only once', () => {
			var args = prototype._getArgs();

			chaiAssert.isObject(args);

			args.test = 'test';

			chaiAssert.deepEqual(args, prototype._getArgs());

			args.test2 = 'test';

			chaiAssert.deepEqual(args, prototype._getArgs());
		});
	});

	describe('_getWhenFn', () => {
		it('returns false false when property has been set on argv and sets property on args object', () => {
			prototype.args = {};
			prototype.argv = {};

			var flagName = 'template';
			var propertyName = 'templateLanguage';

			var whenFn = prototype._getWhenFn(propertyName, flagName);

			chaiAssert.isFunction(whenFn);
			chaiAssert(whenFn({}));

			prototype.argv = {
				template: 'vm',
			};

			whenFn = prototype._getWhenFn(propertyName, flagName);

			chaiAssert.isFunction(whenFn);
			chaiAssert(!whenFn({}));
			chaiAssert.equal(prototype.args[propertyName], 'vm');

			whenFn = prototype._getWhenFn(propertyName, flagName);
		});

		it('correctly implements validator fn', () => {
			prototype.args = {};
			prototype.argv = {};

			var flagName = 'template';
			var propertyName = 'templateLanguage';

			var whenFn = prototype._getWhenFn(
				propertyName,
				flagName,
				(_value) => {
					chaiAssert.fail(
						'Invoked validator with null value',
						'Should have not invoked'
					);
				}
			);

			chaiAssert.isFunction(whenFn);
			chaiAssert(whenFn({}));

			prototype.args = {};
			prototype.argv = {
				template: 'ftl',
			};

			prototype.log = function () {};

			whenFn = prototype._getWhenFn(propertyName, flagName, (value) => {
				chaiAssert(value);

				return true;
			});

			chaiAssert.isFunction(whenFn);
			chaiAssert(!whenFn({}));
			chaiAssert.equal(prototype.args[propertyName], 'ftl');

			prototype.args = {};

			whenFn = prototype._getWhenFn(propertyName, flagName, (_value) => {
				return false;
			});

			chaiAssert.isFunction(whenFn);
			chaiAssert(whenFn({}));
			chaiAssert.equal(prototype.args[propertyName], undefined);
		});

		it('does not prompt if deprecated for specified liferayVersion', () => {
			prototype.args = {};
			prototype.argv = {};
			prototype.promptDeprecationMap = {
				templateLanguage: ['7.0'],
			};

			const flagName = 'template';
			const propertyName = 'templateLanguage';

			let whenFn = prototype._getWhenFn(propertyName, flagName);

			chaiAssert.isFunction(whenFn);
			chaiAssert(
				!whenFn({
					liferayVersion: '7.0',
				})
			);

			prototype.argv = {
				deprecated: true,
			};

			whenFn = prototype._getWhenFn(propertyName, flagName);

			chaiAssert.isFunction(whenFn);
			chaiAssert(
				whenFn({
					liferayVersion: '7.0',
				})
			);
		});
	});

	describe('_isLiferayVersion', () => {
		it('checks for valid Liferay versions', () => {
			_.forEach(['7.1', '7.0'], (version) => {
				chaiAssert.isTrue(
					prototype._isLiferayVersion(version),
					0,
					'Valid Liferay version'
				);
			});

			chaiAssert.isFalse(
				prototype._isLiferayVersion('0.1'),
				-1,
				'Invalid Liferay version'
			);
		});
	});

	describe('_isTemplateLanguage', () => {
		it('checks for valid template languages', () => {
			_.forEach(['ftl'], (template) => {
				chaiAssert.isTrue(
					prototype._isTemplateLanguage(template, {
						liferayVersion: '7.0',
					}),
					0,
					'Valid template language'
				);
			});

			_.forEach(['ftl'], (template) => {
				chaiAssert.isTrue(
					prototype._isTemplateLanguage(template, {
						liferayVersion: '7.1',
					}),
					0,
					'Valid template language'
				);
			});

			chaiAssert.isFalse(
				prototype._isTemplateLanguage('casper', {
					liferayVersion: '7.1',
				}),
				-1,
				'Invalid template language'
			);
		});
	});

	describe('_mixArgs', () => {
		it('mixes props and args', () => {
			var props = prototype._mixArgs(
				{
					liferayVersion: '7.0',
					templateLanguage: 'ftl',
				},
				{
					templateLanguage: 'vm',
					themeId: 'id',
					themeName: 'name',
				}
			);

			chaiAssert.deepEqual(props, {
				liferayVersion: '7.0',
				templateLanguage: 'vm',
				themeId: 'id',
				themeName: 'name',
			});
		});
	});

	describe('_printWarnings', () => {
		it('outputs a specific string if certain conditions are met', () => {
			const deprecated =
				'   Warning: Velocity is deprecated for 7.0, ' +
				'some features will be removed in the next release.';
			const removed = '   Warning: Velocity support was removed in 7.1.';

			prototype.log = sinon.spy();
			prototype._printWarnings({
				liferayVersion: '7.0',
				templateLanguage: 'vm',
			});

			sinonAssert.calledWith(prototype.log, chalk.yellow(deprecated));
			expect(prototype.log.callCount).toBe(1);

			['7.1'].forEach((liferayVersion) => {
				prototype.log.resetHistory();
				prototype._printWarnings({
					liferayVersion,
					templateLanguage: 'vm',
				});
				sinonAssert.calledWith(prototype.log, chalk.yellow(removed));
				expect(prototype.log.callCount).toBe(1);
			});

			['7.0', '7.1'].forEach((liferayVersion) => {
				prototype.log.resetHistory();

				prototype.templateLanguage = 'ftl';
				prototype._printWarnings({
					liferayVersion,
					templateLanguage: 'ftl',
				});
				sinonAssert.notCalled(prototype.log);
			});
		});
	});

	describe('_setArgv', () => {
		it('sets correct argv properties based on shorthand values', () => {
			var originalArgv = process.argv;

			var mockArgv = [
				'node',
				'yo',
				'liferay-theme',
				'-n',
				'My Liferay Theme',
				'-i',
				'my-liferay-theme',
				'-l',
				'7.0',
			];

			process.argv = mockArgv;

			prototype._setArgv();

			chaiAssert.deepEqual(prototype.argv, {
				_: ['liferay-theme'],
				i: 'my-liferay-theme',
				id: 'my-liferay-theme',
				l: '7.0',
				liferayVersion: '7.0',
				n: 'My Liferay Theme',
				name: 'My Liferay Theme',
			});

			process.argv = originalArgv;
		});
	});
});

// TODO: fix functional tests
// const fs = require('fs');
// const helpers = require('yeoman-generator').test;
// const os = require('os');
// const path = require('path');
// const tempDir = path.join(os.tmpdir(), 'temp-test');
// const defaults = {
// 	liferayVersion: '7.1',
// 	themeId: 'test-theme',
// 	themeName: 'Test Theme',
// };
// describe('liferay-theme:app functional tests', function() {
// 	it('creates files', function(done) {
// 		runGenerator(null, function() {
// 			chaiAssert.file([
// 				'gulpfile.js',
// 				'package.json',
// 				'src/css/_custom.scss',
// 				'src/WEB-INF/liferay-plugin-package.properties',
// 			]);
//
// 			done();
// 		});
// 	});
//
// 	it('populates 7.1 package.json correctly', function(done) {
// 		runGenerator(
// 			{
// 				liferayVersion: '7.1',
// 			},
// 			function() {
// 				var pkg = getPackage(defaults.themeId);
//
// 				chaiAssert.equal(pkg.liferayTheme.templateLanguage, 'ftl');
// 				chaiAssert.equal(pkg.liferayTheme.version, '7.1');
// 				chaiAssert.equal(pkg.name, defaults.themeId);
// 				chaiAssert.equal(pkg.version, '1.0.0');
//
// 				var tempThemeDir = path.join(tempDir, defaults.themeId);
//
// 				var pathLookAndFeel = path.join(
// 					tempThemeDir,
// 					'src/WEB-INF/liferay-look-and-feel.xml'
// 				);
//
// 				chaiAssert.fileContent(
// 					pathLookAndFeel,
// 					'<version>7.1.0+</version>'
// 				);
// 				chaiAssert.fileContent(
// 					pathLookAndFeel,
// 					`<theme id="${defaults.themeId}" name="${
// 						defaults.themeName
// 					}">`
// 				);
// 				chaiAssert.fileContent(
// 					pathLookAndFeel,
// 					'<template-extension>ftl</template-extension>'
// 				);
// 				chaiAssert.fileContent(
// 					pathLookAndFeel,
// 					'<!DOCTYPE look-and-feel PUBLIC "-//Liferay//DTD Look and Feel 7.1.0//EN" "http://www.liferay.com/dtd/liferay-look-and-feel_7_1_0.dtd">'
// 				);
//
// 				done();
// 			}
// 		);
// 	});
//
// 	it('populates 7.1 liferay-plugin-package.properties correctly', function(done) {
// 		runGenerator(
// 			{
// 				liferayVersion: '7.1',
// 			},
// 			function() {
// 				var tempThemeDir = path.join(tempDir, defaults.themeId);
//
// 				var pathLiferayPluginPackageProperties = path.join(
// 					tempThemeDir,
// 					'src/WEB-INF/liferay-plugin-package.properties'
// 				);
//
// 				chaiAssert.fileContent(
// 					pathLiferayPluginPackageProperties,
// 					`liferay-versions=7.1.0+`
// 				);
// 				chaiAssert.fileContent(
// 					pathLiferayPluginPackageProperties,
// 					`name=${defaults.themeName}`
// 				);
// 				chaiAssert.notFileContentMatch(
// 					pathLiferayPluginPackageProperties,
// 					/required-deployment-contexts=\\\n#\s+resources-importer-web/
// 				);
//
// 				done();
// 			}
// 		);
// 	});
//
// 	it('populates 7.0 package.json correctly', function(done) {
// 		runGenerator(
// 			{
// 				liferayVersion: '7.0',
// 			},
// 			function() {
// 				var pkg = getPackage(defaults.themeId);
//
// 				chaiAssert.equal(pkg.liferayTheme.templateLanguage, 'ftl');
// 				chaiAssert.equal(pkg.liferayTheme.version, '7.0');
// 				chaiAssert.equal(pkg.name, defaults.themeId);
// 				chaiAssert.equal(pkg.version, '1.0.0');
//
// 				var tempThemeDir = path.join(tempDir, defaults.themeId);
//
// 				var pathLookAndFeel = path.join(
// 					tempThemeDir,
// 					'src/WEB-INF/liferay-look-and-feel.xml'
// 				);
//
// 				chaiAssert.fileContent(
// 					pathLookAndFeel,
// 					'<version>7.0.0+</version>'
// 				);
// 				chaiAssert.fileContent(
// 					pathLookAndFeel,
// 					`<theme id="${defaults.themeId}" name="${
// 						defaults.themeName
// 					}">`
// 				);
// 				chaiAssert.fileContent(
// 					pathLookAndFeel,
// 					'<template-extension>ftl</template-extension>'
// 				);
// 				chaiAssert.fileContent(
// 					pathLookAndFeel,
// 					'<!DOCTYPE look-and-feel PUBLIC "-//Liferay//DTD Look and Feel 7.0.0//EN" "http://www.liferay.com/dtd/liferay-look-and-feel_7_0_0.dtd">'
// 				);
//
// 				done();
// 			}
// 		);
// 	});
//
// 	it('populates 7.0 liferay-plugin-package.properties correctly', function(done) {
// 		runGenerator(
// 			{
// 				liferayVersion: '7.0',
// 			},
// 			function() {
// 				var tempThemeDir = path.join(tempDir, defaults.themeId);
//
// 				var pathLiferayPluginPackageProperties = path.join(
// 					tempThemeDir,
// 					'src/WEB-INF/liferay-plugin-package.properties'
// 				);
//
// 				chaiAssert.fileContent(
// 					pathLiferayPluginPackageProperties,
// 					'liferay-versions=7.0.0+'
// 				);
// 				chaiAssert.fileContent(
// 					pathLiferayPluginPackageProperties,
// 					`name=${defaults.themeName}`
// 				);
// 				chaiAssert.notFileContentMatch(
// 					pathLiferayPluginPackageProperties,
// 					/required-deployment-contexts=\\\n#\s+resources-importer-web/
// 				);
//
// 				done();
// 			}
// 		);
// 	});
//
// 	it('tests themeDirName configuration', function(done) {
// 		runGenerator(null, function() {
// 			var pkg = getPackage('test-theme');
//
// 			chaiAssert.equal(pkg.name, 'test-theme');
//
// 			done();
// 		});
// 	});
// });
//
// function getPackage(themeId) {
// 	var fileContents = fs.readFileSync(
// 		path.join(tempDir, themeId, 'package.json')
// 	);
//
// 	return JSON.parse(fileContents);
// }
//
// function runGenerator(options, end) {
// 	options = options || {};
//
// 	options = _.defaults(options, defaults);
//
// 	delete require.cache[path.join(__dirname, '../index.js')];
//
// 	helpers
// 		.run(path.join(__dirname, '../index.js'))
// 		.inDir(tempDir)
// 		.withOptions({
// 			'skip-install': true,
// 		})
// 		.withPrompt(options)
// 		.on('end', end);
// }
