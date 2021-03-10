import {Component, OnDestroy, OnInit} from '@angular/core';
import {Router} from '@angular/router';
import {
  AccessLevel,
  AuthenticationService,
  AuthHolderService,
  Permission, PermissionType
} from 'oc-ng-common-service';
import {LogOutService} from '@core/services/logout-service/log-out.service';
import {map, takeUntil} from 'rxjs/operators';
import {Subject} from 'rxjs';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
})
export class HeaderComponent implements OnInit, OnDestroy {

  isSSO: any;
  isSsoConfigExist = true;
  isCollapsed = true;
  isMenuCollapsed = true;

  readonly companyPermissions: Permission[] = [
    {
      type: PermissionType.ORGANIZATIONS,
      access: [AccessLevel.MODIFY]
    }
  ];

  private destroy$: Subject<void> = new Subject();

  constructor(public router: Router,
              public authHolderService: AuthHolderService,
              private openIdAuthService: AuthenticationService,
              private logOut: LogOutService) {
  }

  ngOnInit(): void {
    this.isSSO = this.authHolderService?.userDetails?.isSSO;

    this.openIdAuthService.getAuthConfig()
      .pipe(
        takeUntil(this.destroy$),
        map(value => !!value))
      .subscribe((authConfigExistence) => this.isSsoConfigExist = authConfigExistence);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  login() {
    this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.routerState.snapshot.url }});
  }

  logout() {
    this.logOut.logOut();
  }

  closedMenu(link: string){
    this.isMenuCollapsed = true;
    this.isCollapsed = true;
    this.router.navigate([link]);
  }
}
