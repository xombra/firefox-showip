#!/bin/sh
def="en-US"
ext="showip"

b=locale/$def/$ext/$ext
other=$(ls locale/ | grep -v $def)
echo "Other: $other"

for name in $(cut -f2 -d' ' < $b.dtd); do
	line=$(grep " $name " $b.dtd)
	#echo "$name"
	for o in $other; do 
		f=locale/$o/$ext/$ext.dtd
		if ! grep " $name " "$f" >/dev/null; then
			echo "Add $name to $o dtd"
			echo "$line"  >> "$f"
		fi
	done
done

for name in $(cut -f1 -d'=' < $b.properties); do
	line=$(grep "$name=" $b.properties)
	#echo "$name"
	for o in $other; do 
		f=locale/$o/$ext/$ext.properties
		if ! grep "$name=" "$f" >/dev/null; then
			echo "Add $name to $o properties"
			echo "$line"  >> "$f"
		fi
	done
done
