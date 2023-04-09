<!--
  TODO implement

  Search:
  https://opengrok.libreoffice.org/search?full=test&defs=&refs=&path=&hist=&type=&xrd=&nn=19&si=full&searchall=true&si=full
  https://opengrok.libreoffice.org/search?full=a&defs=b&refs=c&path=d&hist=e&type=ada&xrd=&nn=19&searchall=true
  https://opengrok.libreoffice.org/search?&full=a&defs=b&refs=c&path=d&hist=e&type=ada&project=core%2Ccppunit%2Cdev-tools%2Cdictionaries%2Chelp%2Cimpress_remote%2Clibabw%2Clibcdr%2Clibetonyek%2Clibfreehand%2Clibmspub%2Clibpagemaker%2Clibvisio%2Clibzmf%2Codfundiff%2Cofficeotron%2Conline%2Csdk-examples%2Ctranslations&sort=lastmodtime
  https://opengrok.libreoffice.org/search?full=test&defs=&refs=&path=&hist=&type=&xrd=&nn=19&searchall=true&n=25&start=25

  - Can't support `history` search at all as it needs SCM
    integration that zoekt does not have.
  - Can't support pagination.
  - Can parse lucene queries with https://github.com/bripkens/lucene.
  - TBD exactly how well defs & refs map to zoekt sym (and others?).
    If the semantics are similar, we can rewrite; otherwise,
    unsupported.

  Rewriting opengrok projects to zoekt repos of course requires that
  they have the same name. We could perhaps support some kind of way
  to configure a static mapping in addition to this.
-->
