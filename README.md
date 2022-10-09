# ShExHTML
HTML interface for displaying ShEx schemas

The [shex-html module](shex-html.js) allows you to render schemas using unicode and a bit of CSS.

Please see a [terse demo](https://ericprud.github.io/ShExHTML/doc/asTree?NS=http://vocab.example/ns&URL=../examples/AppLib.shex#%23G1-1) or the much larger [DDI demo](https://ericprud.github.io/ShExHTML/doc/asTree?NS=http://ddi-alliance.org/ns/%23&URL=https://raw.githubusercontent.com/ericprud/XMItoRDF/modular/site/DDI_4-DR0.2-nested.shex#FixedText) for an idea of the output.

☑ Features and ☐ TODO:
* [x] EachOf (list of TripleConstraints)
* [ ] OneOf
* [x] nested tripleExpressions
* [x] Shapes
* [x] EXTENDS
* [x] ShapeAnd (list of shapeExpressions)
* [x] ShapeOr
