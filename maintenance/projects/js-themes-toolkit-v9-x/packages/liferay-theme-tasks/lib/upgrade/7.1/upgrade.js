/**
 * SPDX-FileCopyrightText: © 2017 Liferay, Inc. <https://liferay.com>
 * SPDX-License-Identifier: MIT
 */

'use strict';

const spawn = require('cross-spawn');
const insert = require('gulp-insert');
const replace = require('gulp-replace-task');
const inquirer = require('inquirer');

const lfrThemeConfig = require('../../liferay_theme_config');
const devDependencies = require('../../devDependencies')['theme']['7.2'];

module.exports = function (options) {
	const gulp = options.gulp;

	const runSequence = require('run-sequence').use(gulp);

	gulp.task('upgrade:dependencies', (cb) => {
		lfrThemeConfig.removeDependencies(['liferay-theme-deps-7.1']);
		lfrThemeConfig.setDependencies(devDependencies.default, true);

		if (options.includeFontAwesome) {
			lfrThemeConfig.setDependencies(
				{
					'liferay-font-awesome':
						devDependencies.optional['liferay-font-awesome'],
				},
				true
			);
		}
		else {
			lfrThemeConfig.removeDependencies(['liferay-font-awesome']);
		}

		const npmInstall = spawn('npm', ['install']);

		npmInstall.stderr.pipe(process.stderr);
		npmInstall.stdout.pipe(process.stdout);

		npmInstall.on('close', cb);
	});

	gulp.task('upgrade:config', () => {
		const lfrThemeConfig = require('../../liferay_theme_config');

		lfrThemeConfig.setConfig({
			fontAwesome: options.includeFontAwesome,
			version: '7.2',
		});

		return gulp
			.src(
				'src/WEB-INF/+(liferay-plugin-package.properties|liferay-look-and-feel.xml)'
			)
			.pipe(
				replace({
					patterns: [
						{
							match: /(DTD Look and Feel )\d(?:\.\d+)+(\/\/EN)/g,
							replacement: '$17.2.0$2',
						},
						{
							match: /(liferay-look-and-feel_)\d(?:_\d+)+(\.dtd)/g,
							replacement: '$17_2_0$2',
						},
						{
							match: /(<version>).+(<\/version>)/g,
							replacement: '$17.2.0+$2',
						},
						{
							match: /(liferay-versions=)\d(?:\.\d+)+\+?/g,
							replacement: '$17.2.0+',
						},
					],
				})
			)
			.pipe(gulp.dest('src/WEB-INF'));
	});

	gulp.task('upgrade:fontAwesome', () => {
		return gulp
			.src('src/css/_custom.scss')
			.pipe(
				insert.prepend(
					"@import 'liferay-font-awesome/scss/font-awesome';\n" +
						"@import 'liferay-font-awesome/scss/glyphicons';\n\n"
				)
			)
			.pipe(gulp.dest('src/css/'));
	});

	return function (cb) {
		inquirer.prompt(
			[
				{
					default: true,
					message:
						'Do you want to include Font Awesome in your theme?',
					name: 'includeFontAwesome',
					type: 'confirm',
				},
			],
			(answers) => {
				const taskArray = ['upgrade:config', 'upgrade:dependencies'];

				if (answers.includeFontAwesome) {
					taskArray.push('upgrade:fontAwesome');
				}

				taskArray.push(cb);

				Object.assign(options, answers);

				runSequence.apply(this, taskArray);
			}
		);
	};
};
