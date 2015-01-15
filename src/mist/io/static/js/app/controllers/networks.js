define('app/controllers/networks', ['app/models/network'],
	//
	//  Networks Controller
	//
	//	@returns Class
	//
	function (Network) {

		'use strict';

		return Ember.ArrayController.extend(Ember.Evented, {


			//
			//
			//  Properties
			//
			//


			content: null,
			loading: null,
			backend: null,


            //
            //
            //  Initialization
            //
            //


            init: function () {
                this._super();
                this.set('content', []);
                this.set('loading', true);
            },


            //
            //
            //  Methods
            //
            //


            load: function (networks) {
                this._updateContent(networks);
                this.set('loading', false);
            },


            getNetwork: function (networkId) {
                return this.content.findBy('id', networkId);
            },


			associateNetwork: function (args) {

				var machineId;
				if (args.machine.backend.provider == 'nephoscale')
					machineId = args.machine.extra.id;
				else
					machineId = args.machine.id;

				var url = '/backends/' + this.backend.id +
					'/networks/' + args.network.id;

				var that = this;
				that.set('associatingNetwork',  true);
				Mist.ajax.POST(url, {
					machine: machineId,
					ip: args.ip.ipaddress,
				}).error(function () {
					Mist.notificationController.notify('Failed to associate ip ' + args.ip.ipaddress);
				}).complete(function (success, data) {
					that.set('associatingNetwork',  false);
					if (args.callback) args.callback(success, data);
				});
			},


			reserveIP: function (args) {
				var url = '/backends/' + this.backend.id +
				'/networks/' + args.network.id;

				var that = this;
				that.set('reservingIP',  true);
				Mist.ajax.POST(url, {
					ip: args.ip.ipaddress,
					assign: !args.ip.reserved
				}).error(function () {
					Mist.notificationController.notify('Failed to reserve ip ' + args.ip.ipaddress);
				}).complete(function (success, data) {
					that.set('reservingIP',  false);
					if (args.callback) args.callback(success, data);
				});
			},


            deleteNetwork: function (networkId, callback) {
				
                var that = this;
                that.set('deletingNetwork', true);
                var url = '/backends/' + this.backend.id +
                    '/networks/' + networkId;
                Mist.ajax.DELETE(url)
                .success(function () {
                    that._deleteNetwork(networkId);
                }).error(function (message) {
                    Mist.notificationController.notify(message);
                }).complete(function (success, message) {
                    that.set('deletingNetwork', false);
                    if (callback) callback(success, message);
                });
            },


            //
            //
            //  Pseudo-Private Methods
            //
            //


            _updateContent: function (networks) {

                Ember.run.next(function(){
                    $('#single-network-subnets').trigger('create');
                    $('#single-network-subnets').collapsible();
                });

                Ember.run(this, function () {

                    // Remove deleted networks
                    this.content.forEach(function (network) {
                        if (!networks.findBy('id', network.id))
                            this.content.removeObject(network);
                    }, this);

                    networks.forEach(function (network) {

                        var oldNetwork = this.getNetwork(network.id);

                        if (oldNetwork)
                            // Update existing networks
                            forIn(network, function (value, property) {
                                oldNetwork.set(property, value);
                            });
                        else
                            // Add new networks
                            this._addNetwork(network);
                    }, this);

                    this.trigger('onNetworkListChange');
                });

            },


            _addNetwork: function (network) {
                Ember.run(this, function () {
                    network.backend = this.backend;
                    this.content.addObject(Network.create(network));
                    this.trigger('onNetworkAdd');
                });
            },


            _deleteNetwork: function (networkId) {
                Ember.run(this, function () {
                    this.content.removeObject(this.getNetwork(networkId));
                    this.trigger('onNetworkDelete');
                });
            },


            _updateSelectedNetworks: function() {
                Ember.run(this, function() {
                    var newSelectedNetworks = this.content.filter(function (network) {
                        return network.selected;
                    });
                    this.set('selectedNetworks', newSelectedNetworks);
                    this.trigger('onSelectedNetworksChange');
                });
            },


            //
            //
            //  Observers
            //
            //


            selectedNetworksObserver: function() {
                Ember.run.once(this, '_updateSelectedNetworks');
            }.observes('content.@each.selected')
		});
	}
);
