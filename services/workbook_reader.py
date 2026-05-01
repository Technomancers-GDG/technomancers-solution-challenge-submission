from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from zipfile import ZipFile
import xml.etree.ElementTree as ET


NS_MAIN = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
NS_DOCREL = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}"
NS_PKGREL = "{http://schemas.openxmlformats.org/package/2006/relationships}"


def _column_letters(cell_ref: str) -> str:
    return "".join(character for character in cell_ref if character.isalpha())


def _normalize_target(target: str) -> str:
    target = target.lstrip("/")
    return target if target.startswith("xl/") else f"xl/{target}"


@dataclass(slots=True)
class SheetInfo:
    name: str
    target: str


class WorkbookXmlReader:
    def __init__(self, path: Path | str) -> None:
        self.path = Path(path)

    def _read_shared_strings(self, archive: ZipFile) -> list[str]:
        shared_name = "xl/sharedStrings.xml"
        if shared_name not in archive.namelist():
            return []
        root = ET.fromstring(archive.read(shared_name))
        values: list[str] = []
        for si in root.findall(f"{NS_MAIN}si"):
            values.append("".join(node.text or "" for node in si.iter(f"{NS_MAIN}t")))
        return values

    def _sheet_map(self, archive: ZipFile) -> list[SheetInfo]:
        workbook = ET.fromstring(archive.read("xl/workbook.xml"))
        rels = ET.fromstring(archive.read("xl/_rels/workbook.xml.rels"))
        relationship_map = {
            rel.attrib["Id"]: _normalize_target(rel.attrib["Target"])
            for rel in rels.findall(f"{NS_PKGREL}Relationship")
        }
        return [
            SheetInfo(
                name=sheet.attrib["name"],
                target=relationship_map[sheet.attrib[f"{NS_DOCREL}id"]],
            )
            for sheet in workbook.find(f"{NS_MAIN}sheets").findall(f"{NS_MAIN}sheet")
        ]

    def _cell_value(self, cell: ET.Element, shared_strings: list[str]) -> str | None:
        cell_type = cell.attrib.get("t")
        value_node = cell.find(f"{NS_MAIN}v")
        if cell_type == "inlineStr":
            inline_node = cell.find(f"{NS_MAIN}is")
            if inline_node is None:
                return None
            return "".join(node.text or "" for node in inline_node.iter(f"{NS_MAIN}t"))
        if value_node is None:
            return None
        raw = value_node.text
        if cell_type == "s" and raw is not None:
            return shared_strings[int(raw)]
        return raw

    def sheet_names(self) -> list[str]:
        with ZipFile(self.path) as archive:
            return [sheet.name for sheet in self._sheet_map(archive)]

    def iter_sheet_rows(self, sheet_name: str) -> list[dict[str, str | None]]:
        with ZipFile(self.path) as archive:
            shared_strings = self._read_shared_strings(archive)
            target = next(
                sheet.target
                for sheet in self._sheet_map(archive)
                if sheet.name == sheet_name
            )
            root = ET.fromstring(archive.read(target))
            rows = root.find(f"{NS_MAIN}sheetData")
            if rows is None:
                return []
            headers: dict[str, str | None] | None = None
            output: list[dict[str, str | None]] = []
            for row in rows.findall(f"{NS_MAIN}row"):
                values = {
                    _column_letters(cell.attrib.get("r", "")): self._cell_value(cell, shared_strings)
                    for cell in row.findall(f"{NS_MAIN}c")
                }
                if headers is None:
                    headers = {column: values[column] for column in sorted(values)}
                    continue
                output.append(
                    {
                        str(headers[column]): values.get(column)
                        for column in sorted(headers)
                        if headers[column]
                    }
                )
            return output
