import { Component, OnInit } from '@angular/core';
import { StripeLoaderService } from '@core/services/stripe-loader.service';
import { AppsService, AppVersionService, CreditCard, PaymentTaxesResponse, StripeService } from '@openchannel/angular-common-services';
import { ActivatedRoute, Router } from '@angular/router';
import { LoadingBarState } from '@ngx-loading-bar/core/loading-bar.state';
import { LoadingBarService } from '@ngx-loading-bar/core';
import { Subject } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';
import { FullAppData } from '@openchannel/angular-common-components';
import { pageConfig } from 'assets/data/configData';

@Component({
    selector: 'app-checkout',
    templateUrl: './checkout.component.html',
    styleUrls: ['./checkout.component.scss'],
})
export class CheckoutComponent implements OnInit {
    app: FullAppData;
    card: CreditCard;
    paymentAndTaxes: PaymentTaxesResponse;
    termsUrl = 'https://my.openchannel.io/terms-of-service';
    policyUrl = 'https://my.openchannel.io/data-processing-policy';

    isTerms = false;
    validateCheckbox = false;

    private loader: LoadingBarState;
    private $destroy: Subject<void> = new Subject<void>();

    constructor(
        private stripeLoader: StripeLoaderService,
        private appService: AppsService,
        private activeRoute: ActivatedRoute,
        private loadingBar: LoadingBarService,
        private appVersionService: AppVersionService,
        private router: Router,
        private stripeService: StripeService,
    ) {}

    ngOnInit(): void {
        this.loader = this.loadingBar.useRef();

        this.stripeLoader.loadStripe();
        this.loadAppData();
    }

    get currencySymbol(): string {
        const isoCurrencyCode = {
            USD: '$',
            EUR: '€',
            CNY: '¥',
            GBP: '£',
        };

        return isoCurrencyCode[this.app?.model[0].currency] || isoCurrencyCode[0];
    }

    goBack(): void {
        history.back();
    }

    onSuccessButtonPressed(): void {
        this.validateCheckbox = !this.isTerms;
    }

    onCardDataLoaded(cardData: CreditCard): void {
        this.card = cardData;
        this.loader.start();

        this.stripeService
            .getTaxesAndPayment(this.card.address_country, this.card.address_state, this.app.appId, this.app.model[0].modelId)
            .pipe(takeUntil(this.$destroy))
            .subscribe(
                taxesResponse => {
                    this.paymentAndTaxes = taxesResponse;
                    this.loader.complete();
                },
                () => this.loader.complete(),
            );
    }

    getSubtotal(): string {
        let subtotal = this.currencySymbol + this.app?.model[0].price;
        if (this.paymentAndTaxes && this.paymentAndTaxes.subtotal) {
            subtotal = this.currencySymbol + this.paymentAndTaxes.subtotal;
        }
        return subtotal;
    }

    navigateToMarketplace(): void {
        this.router.navigate(['/']).then();
    }

    private loadAppData(): void {
        this.loader.start();

        const appId = this.activeRoute.snapshot.paramMap.get('appId');
        const appVersion = this.activeRoute.snapshot.paramMap.get('appVersion');
        const safeName = this.activeRoute.snapshot.paramMap.get('safeName');

        const appRequest = safeName
            ? this.appService.getAppBySafeName(safeName)
            : this.appVersionService.getAppByVersion(appId, Number(appVersion));

        appRequest
            .pipe(
                takeUntil(this.$destroy),
                map(app => {
                    const mappedApp = new FullAppData(app, pageConfig.fieldMappings);
                    if (typeof mappedApp.images[0] === 'string') {
                        mappedApp.images = (mappedApp.images as string[]).map(imageItem => {
                            return {
                                image: imageItem,
                            };
                        });
                    }
                    return mappedApp;
                }),
            )
            .subscribe(
                app => {
                    this.app = app;
                    this.loader.complete();
                },
                () => this.loader.complete(),
            );
    }
}
