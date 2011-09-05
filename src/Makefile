#    ShowIP Firefox Extension
#    Copyright (C) 2007 Jan Dittmer <jdi@l4x.org>
#    GPLv2 only

# version should be .00 for release, .99 for beta of version+1

REVISION:=$(shell svn info | grep Revision | sed 's/Revision: //')

VERSION:="1.2rc$(REVISION)b$(shell printf "%04d" $(shell cat buildnr))"

RELEASES:="../releases"

all: build

build:
	@echo Version: $(VERSION)
	svn up || true
	test -e buildnr || echo -n 0 > buildnr
	@echo Build No $(shell cat buildnr)
	for f in install.rdf install.js; do \
	sed "s/SHOWIPVERSION/$(VERSION)/g" $$f.template \
		> $$f; \
	sed "s/GITDESCRIBE/$(shell git describe)/g" $$f.template \
		> $$f; \
	done
	mv *.xpi archive/ || true
	rm ipv6ident.jar || true
#	mv chrome.manifest chrome.manifest.dev
	cp chrome.manifest.release chrome.manifest
	ant
	mv showip.xpi showip_$(VERSION).xpi
#	mv chrome.manifest chrome.manifest.release
	cp chrome.manifest.dev chrome.manifest
	@expr 1 + $(shell cat buildnr) > buildnr.tmp
	@mv buildnr.tmp buildnr

release: build
	test -d "$(RELEASES)"
	if git diff | grep '+' >/dev/null; then echo "There are changes, won't make a release!"; false; fi
	if git tag | grep $(VERSION); then echo "Release already exists!"; false; fi
	if test -e $(RELEASES)/showip_$(VERSION).xpi; then echo "Release already exists!"; false; fi
	read "All checks passed. Are you sure you want to pack release $(VERSION)??" || true
	git tag $(VERSION) && git push origin
	cp showip_$(VERSION).xpi ../releases/
	cd $(RELEASES) && (git add showip_$(VERSION).xpi && git commit -m 'New release $(VERSION)' && git push)

revision:
	@echo $(REVISION)
version:
	@echo showip_$(shell echo $(VERSION) | sed s/\\./_/g)$(shell printf "%04d" $(shell cat buildnr)).xpi

clean:
	rm ipv6ident.jar || true
	rm install.rdf || true
	rm install.js || true
	rm chrome.manifest || true
	mv *.xpi archive/ || true
