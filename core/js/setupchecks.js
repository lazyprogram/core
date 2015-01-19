/*
 * Copyright (c) 2014
 *
 * This file is licensed under the Affero General Public License version 3
 * or later.
 *
 * See the COPYING-README file.
 *
 */

(function() {
	OC.SetupChecks = {
		/**
		 * Check whether the WebDAV connection works.
		 *
		 * @return $.Deferred object resolved with an array of error messages
		 */
		checkWebDAV: function() {
			var deferred = $.Deferred();
			var afterCall = function(xhr) {
				var messages = [];
				if (xhr.status !== 207 && xhr.status !== 401) {
					messages.push(
						t('core', 'Your web server is not yet properly setup to allow files synchronization because the WebDAV interface seems to be broken.')
					);
				}
				deferred.resolve(messages);
			};

			$.ajax({
				type: 'PROPFIND',
				url: OC.linkToRemoteBase('webdav'),
				data: '<?xml version="1.0"?>' +
						'<d:propfind xmlns:d="DAV:">' +
						'<d:prop><d:resourcetype/></d:prop>' +
						'</d:propfind>',
				complete: afterCall
			});
			return deferred.promise();
		},

		/**
		 * Runs setup checks on the server side
		 *
		 * @return $.Deferred object resolved with an array of error messages
		 */
		checkSetup: function() {
			var deferred = $.Deferred();
			var afterCall = function(data, statusText, xhr) {
				var messages = [];
				if (xhr.status === 200 && data) {
					if (!data.serverHasInternetConnection) {
						messages.push(
							t('core', 'This server has no working internet connection. This means that some of the features like mounting of external storage, notifications about updates or installation of 3rd party apps don´t work. Accessing files from remote and sending of notification emails might also not work. We suggest to enable internet connection for this server if you want to have all features.')
						);
					}
					if(!data.dataDirectoryProtected) {
						messages.push(
							t('core', 'Your data directory and your files are probably accessible from the internet. The .htaccess file is not working. We strongly suggest that you configure your webserver in a way that the data directory is no longer accessible or you move the data directory outside the webserver document root.')
						);
					}
				} else {
					messages.push(t('core', 'Error occurred while checking server setup'));
				}
				deferred.resolve(messages);
			};

			$.ajax({
				type: 'GET',
				url: OC.generateUrl('settings/ajax/checksetup')
			}).then(afterCall, afterCall);
			return deferred.promise();
		},

		/**
		 * Runs check for some generic security headers on the server side
		 *
		 * @return $.Deferred object resolved with an array of error messages
		 */
		checkSecurityHeaders: function() {
			var deferred = $.Deferred();
			var afterCall = function(data, statusText, xhr) {
				var messages = [];
				if (xhr.status === 200) {
					var securityHeaders = {
						'X-XSS-Protection': '1; mode=block',
						'X-Content-Type-Options': 'nosniff',
						'X-Robots-Tag': 'none',
						'X-Frame-Options': 'SAMEORIGIN'
					};

					for (header in securityHeaders) {
						if(xhr.getResponseHeader(header) !== securityHeaders[header]) {
							messages.push(
								t('core', 'The "{header}" HTTP header is not configured to equal to "{expected}". This is a potential security risk and we recommend adjusting this setting.', {header: header, expected: securityHeaders[header]})
							);
						}
					}
				} else {
					messages.push(t('core', 'Error occurred while checking server setup'));
				}
				deferred.resolve(messages);
			};

			$.ajax({
				type: 'GET',
				url: OC.generateUrl('heartbeat')
			}).then(afterCall, afterCall);

			return deferred.promise();
		},

		/**
		 * Runs check for some SSL configuration issues on the server side
		 *
		 * @return $.Deferred object resolved with an array of error messages
		 */
		checkSSL: function() {
			var deferred = $.Deferred();
			var afterCall = function(data, statusText, xhr) {
				var messages = [];
				if (xhr.status === 200) {

					if(location.protocol === 'https:') {
						// Extract the value of 'Strict-Transport-Security'
						var transportSecurityValidity = xhr.getResponseHeader('Strict-Transport-Security');
						if(transportSecurityValidity !== null && transportSecurityValidity.length > 8) {
							var firstComma = transportSecurityValidity.indexOf(";");
							if(firstComma !== -1) {
								transportSecurityValidity = transportSecurityValidity.substring(8, firstComma);
							} else {
								transportSecurityValidity = transportSecurityValidity.substring(8);
							}
						}

						if(transportSecurityValidity <=  2678400) {
							messages.push(
								t('core', 'The "Strict-Transport-Security" HTTP header is not configured to least "2,678,400" seconds. This is a potential security risk and we recommend adjusting this setting.')
							);
						}
					} else {
						messages.push(
							t('core', 'You are accessing this site via HTTP. We strongly suggest you configure your server to require using HTTPS instead.')
						);
					}
				} else {
					messages.push(t('core', 'Error occurred while checking server setup'));
				}
				deferred.resolve(messages);
			};

			$.ajax({
				type: 'GET',
				url: OC.generateUrl('heartbeat')
			}).then(afterCall, afterCall);

			return deferred.promise();
		}
	};
})();

