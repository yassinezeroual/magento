/**
 * Copyright © 2013-2017 Magento, Inc. All rights reserved.
 * See COPYING.txt for license details.
 */
// jscs:disable jsDoc
define([
    'uiComponent',
    'jquery',
    'ko',
    'underscore',
    'Magento_Ui/js/grid/paging/paging',
    'mage/translate'
], function (Component, $, ko, _, paging) {
    'use strict';

    return Component.extend({
        defaults: {
            modules: {
                variationsComponent: '${ $.variationsComponent }'
            },
            notificationMessage: {
                text: null,
                error: null
            },
            gridExisting: [],
            gridNew: [],
            gridDeleted: [],
            variationsExisting: [],
            variationsNew: [],
            variationsDeleted: [],
            pagingExisting: paging({
                name: 'configurableWizard.pagingExisting',
                sizesConfig: {
                    component: 'Magento_ConfigurableProduct/js/variations/paging/sizes',
                    name: 'configurableWizard.pagingExisting_sizes'
                }
            }),
            pagingNew: paging({
                name: 'configurableWizard.pagingNew',
                sizesConfig: {
                    component: 'Magento_ConfigurableProduct/js/variations/paging/sizes',
                    name: 'configurableWizard.pagingNew_sizes'
                }
            }),
            pagingDeleted: paging({
                name: 'configurableWizard.pagingDeleted',
                sizesConfig: {
                    component: 'Magento_ConfigurableProduct/js/variations/paging/sizes',
                    name: 'configurableWizard.pagingDeleted_sizes'
                }
            }),
            attributes: [],
            attributesName: [$.mage.__('Images'), $.mage.__('SKU'), $.mage.__('Quantity'), $.mage.__('Price')],
            sections: [],
            gridTemplate: 'Magento_ConfigurableProduct/variations/steps/summary-grid'
        },
        initObservable: function () {
            var pagingObservables = {
                currentNew: ko.getObservable(this.pagingNew, 'current'),
                currentExisting: ko.getObservable(this.pagingExisting, 'current'),
                currentDeleted: ko.getObservable(this.pagingDeleted, 'current'),
                pageSizeNew: ko.getObservable(this.pagingNew, 'pageSize'),
                pageSizeExisting: ko.getObservable(this.pagingExisting, 'pageSize'),
                pageSizeDeleted: ko.getObservable(this.pagingDeleted, 'pageSize')
            };

            this._super().observe('gridExisting gridNew gridDeleted attributes sections');
            this.gridExisting.columns = ko.observableArray();
            this.gridNew.columns = ko.observableArray();
            this.gridDeleted.columns = ko.observableArray();

            _.each(pagingObservables, function (observable) {
                observable.subscribe(function () {
                    this.generateGrid();
                }, this);
            }, this);

            return this;
        },
        nextLabelText: $.mage.__('Generate Products'),
        variations: [],
        calculate: function (variations, getSectionValue) {
            var productSku = this.variationsComponent().getProductValue('sku'),
                productPrice = this.variationsComponent().getProductValue('price'),
                productWeight = this.variationsComponent().getProductValue('weight'),
                variationsKeys = [],
                gridExisting = [],
                gridNew = [],
                gridDeleted = [];

            this.variations = [];
            _.each(variations, function (options) {
                var product, images, sku, quantity, price, variation,
                    productId = this.variationsComponent().getProductIdByOptions(options);

                if (productId) {
                    product = _.findWhere(this.variationsComponent().variations, {
                        productId: productId
                    });
                }
                images = getSectionValue('images', options);
                sku = productSku + _.reduce(options, function (memo, option) {
                        return memo + '-' + option.label;
                    }, '');
                quantity = getSectionValue('quantity', options);

                if (!quantity && productId && product) {
                    quantity = product.quantity;
                }
                price = getSectionValue('price', options);

                if (!price) {
                    price = productId && product ? product.price : productPrice;
                }

                if (productId && !images.file && product) {
                    images = product.images;
                }
                variation = {
                    options: options,
                    images: images,
                    sku: sku,
                    quantity: quantity,
                    price: price,
                    productId: productId,
                    weight: productWeight,
                    editable: true
                };

                if (productId && product) {
                    variation.sku = product.sku;
                    variation.weight = product.weight;
                    gridExisting.push(this.prepareRowForGrid(variation));
                } else {
                    gridNew.push(this.prepareRowForGrid(variation));
                }
                this.variations.push(variation);
                variationsKeys.push(this.variationsComponent().getVariationKey(options));
            }, this);

            _.each(_.omit(this.variationsComponent().productAttributesMap, variationsKeys), function (productId) {
                var variationToDelete = _.findWhere(this.variationsComponent().variations, {
                    productId: productId
                });

                if (variationToDelete) {
                    gridDeleted.push(this.prepareRowForGrid(variationToDelete));
                }
            }.bind(this));

            this.variationsExisting = gridExisting;
            this.variationsNew = gridNew;
            this.variationsDeleted = gridDeleted;

        },
        generateGrid: function () {
            var pageExisting = this.pagingExisting.pageSize * this.pagingExisting.current,
                pageNew = this.pagingNew.pageSize * this.pagingNew.current,
                pageDeleted = this.pagingDeleted.pageSize * this.pagingDeleted.current;

            this.pagingExisting.totalRecords = this.variationsExisting.length;
            this.gridExisting(this.variationsExisting.slice(pageExisting - this.pagingExisting.pageSize, pageExisting));

            this.pagingNew.totalRecords = this.variationsNew.length;
            this.gridNew(this.variationsNew.slice(pageNew - this.pagingNew.pageSize, pageNew));

            this.pagingDeleted.totalRecords = this.variationsDeleted.length;
            this.gridDeleted(this.variationsDeleted.slice(pageDeleted - this.pagingDeleted.pageSize, pageDeleted));
        },
        prepareRowForGrid: function (variation) {
            var row = [];

            row.push(_.extend({
                images: []
            }, variation.images));
            row.push(variation.sku);
            row.push(variation.quantity);
            _.each(variation.options, function (option) {
                row.push(option.label);
            });
            row.push(this.variationsComponent().getCurrencySymbol() +  ' ' + variation.price);

            return row;
        },
        getGridTemplate: function () {
            return this.gridTemplate;
        },
        getGridId: function () {
            return _.uniqueId('grid_');
        },
        getColumnsName: function (attributes) {
            var columns = this.attributesName.slice(0);

            attributes.each(function (attribute, index) {
                columns.splice(3 + index, 0, attribute.label);
            }, this);

            return columns;
        },
        render: function (wizard) {
            this.wizard = wizard;
            this.sections(wizard.data.sections());
            this.attributes(wizard.data.attributes());
            this.gridNew([]);
            this.gridExisting([]);
            this.gridDeleted([]);
            this.gridExisting.columns(this.getColumnsName(this.wizard.data.attributes));
            this.gridNew.columns(this.getColumnsName(this.wizard.data.attributes));
            this.gridDeleted.columns(this.getColumnsName(this.variationsComponent().productAttributes));
            this.calculate(wizard.data.variations, wizard.data.sectionHelper);
            this.generateGrid();
        },
        force: function () {
            this.variationsComponent().render(this.variations, this.attributes());
            $('[data-role=step-wizard-dialog]').trigger('closeModal');
        },
        back: function () {
        }
    });
});
